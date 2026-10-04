use serde::Serialize;
use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Write},
    os::unix::process::CommandExt,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

#[derive(Clone, Debug, Serialize)]
pub struct Snapshot {
    pub phase: String,
    pub generation: u64,
    pub pid: Option<u32>,
    pub error: Option<String>,
    pub capabilities: Option<Value>,
    pub last_probe: Option<Value>,
}
struct Inner {
    snapshot: Snapshot,
    child: Option<Child>,
    request_id: u64,
}
impl Inner {
    fn reap(&mut self) {
        if let Some(mut child) = self.child.take() {
            // Only our unreaped child can own this process group. Never discover
            // or adopt a server by port/PID. setsid is installed before exec.
            unsafe {
                libc::kill(-(child.id() as i32), libc::SIGKILL);
            }
            let _ = child.wait();
        }
        self.snapshot.pid = None;
    }
}
impl Drop for Inner {
    fn drop(&mut self) {
        self.reap();
    }
}
#[derive(Clone)]
pub struct Supervisor {
    inner: Arc<Mutex<Inner>>,
    executable: PathBuf,
    args: Vec<String>,
    timeout: Duration,
}
impl Supervisor {
    pub fn new(executable: PathBuf, args: Vec<String>, timeout: Duration) -> Self {
        Self {
            inner: Arc::new(Mutex::new(Inner {
                child: None,
                request_id: 0,
                snapshot: Snapshot {
                    phase: "idle".into(),
                    generation: 0,
                    pid: None,
                    error: None,
                    capabilities: None,
                    last_probe: None,
                },
            })),
            executable,
            args,
            timeout,
        }
    }
    pub fn snapshot(&self) -> Snapshot {
        self.inner.lock().unwrap().snapshot.clone()
    }
    pub fn retry(&self) -> Result<(), String> {
        let (tx, rx) = std::sync::mpsc::channel();
        let owner = self.clone();
        thread::spawn(move || {
            if let Err(error) = owner.start_and_monitor(&tx) {
                let _ = tx.send(Err(error));
            }
        });
        rx.recv()
            .unwrap_or_else(|_| Err("engine-owner-unavailable".into()))
    }
    fn start_and_monitor(
        &self,
        tx: &std::sync::mpsc::Sender<Result<(), String>>,
    ) -> Result<(), String> {
        let mut inner = self.inner.lock().unwrap();
        if inner.snapshot.phase == "closed" {
            return Err("window-closed".into());
        }
        inner.reap();
        inner.snapshot.generation += 1;
        let generation = inner.snapshot.generation;
        inner.snapshot.phase = "starting".into();
        inner.snapshot.error = None;
        inner.snapshot.capabilities = None;
        inner.snapshot.last_probe = None;
        let mut command = Command::new(&self.executable);
        command
            .args(&self.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        // No inherited DB override, PYTHONPATH, credentials, or network config.
        command.env_clear().env("LANG", "C.UTF-8");
        unsafe {
            command.pre_exec(|| {
                if libc::setsid() == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                if libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGKILL) == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }
        let mut child = command.spawn().map_err(|_| {
            inner.snapshot.phase = "failed".into();
            inner.snapshot.error = Some("engine-start-failed".into());
            "engine-start-failed".to_string()
        })?;
        let stdout = child.stdout.take().unwrap();
        inner.snapshot.pid = Some(child.id());
        inner.child = Some(child);
        let state = self.inner.clone();
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                let Ok(line) = line else {
                    break;
                };
                let Ok(message) = serde_json::from_str::<Value>(&line) else {
                    break;
                };
                let mut inner = state.lock().unwrap();
                if inner.snapshot.generation != generation || inner.snapshot.phase == "closed" {
                    break;
                }
                if message["event"] == "ready" {
                    if message["protocol"] != 1
                        || message["operations"] != json!(["probe"])
                        || message["source"] != "not-opened"
                        || inner.snapshot.phase != "starting"
                    {
                        inner.reap();
                        inner.snapshot.phase = "failed".into();
                        inner.snapshot.error = Some("engine-protocol-mismatch".into());
                        break;
                    }
                    inner.snapshot.phase = "ready".into();
                    inner.snapshot.capabilities = Some(message);
                } else if message["event"] == "reply"
                    && message["protocol"] == 1
                    && message["generation"] == generation
                    && message["id"] == inner.request_id
                    && inner.snapshot.phase == "ready"
                {
                    inner.snapshot.last_probe =
                        Some(json!({"id":inner.request_id,"result":message["result"]}));
                }
            }
        });
        // Linux PDEATHSIG belongs to the spawning THREAD. This owner thread
        // therefore remains alive until its child is reaped, not just until
        // a short-lived Tauri request has returned.
        drop(inner);
        let _ = tx.send(Ok(()));
        let state = self.inner.clone();
        let timeout = self.timeout;
        {
            let began = std::time::Instant::now();
            loop {
                thread::sleep(Duration::from_millis(25));
                let mut inner = state.lock().unwrap();
                if inner.snapshot.generation != generation
                    || ["closed", "failed"].contains(&inner.snapshot.phase.as_str())
                {
                    break;
                }
                let exited = inner
                    .child
                    .as_mut()
                    .is_some_and(|child| child.try_wait().ok().flatten().is_some());
                let timed_out = inner.snapshot.phase == "starting" && began.elapsed() >= timeout;
                if exited || timed_out {
                    inner.reap();
                    inner.snapshot.phase = "failed".into();
                    inner.snapshot.capabilities = None;
                    inner.snapshot.error = Some(
                        if exited {
                            "engine-exited"
                        } else {
                            "engine-ready-timeout"
                        }
                        .into(),
                    );
                    break;
                }
            }
        }
        Ok(())
    }
    pub fn probe(&self) -> Result<u64, String> {
        let mut inner = self.inner.lock().unwrap();
        if inner.snapshot.phase != "ready" {
            return Err("engine-not-ready".into());
        }
        inner.request_id += 1;
        let id = inner.request_id;
        let request = json!({"protocol":1,"id":id,"generation":inner.snapshot.generation,"operation":"probe"});
        inner.snapshot.last_probe = None;
        let stdin = inner
            .child
            .as_mut()
            .and_then(|child| child.stdin.as_mut())
            .ok_or("engine-not-ready")?;
        writeln!(stdin, "{request}").map_err(|_| "engine-write-failed")?;
        Ok(id)
    }
    pub fn close(&self) {
        let mut inner = self.inner.lock().unwrap();
        inner.snapshot.phase = "closed".into();
        inner.snapshot.generation += 1;
        inner.reap();
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        path::PathBuf,
        thread,
        time::{Duration, Instant},
    };

    fn wait(s: &Supervisor, phase: &str) -> Snapshot {
        let until = Instant::now() + Duration::from_secs(5);
        loop {
            let snap = s.snapshot();
            if snap.phase == phase {
                return snap;
            }
            assert!(Instant::now() < until, "wanted {phase}, got {:?}", snap);
            thread::sleep(Duration::from_millis(10));
        }
    }
    fn fixture(mode: &str) -> Supervisor {
        Supervisor::new(PathBuf::from("/usr/bin/python3"), vec![
            "-u".into(), "-c".into(), format!(
                "import json,sys,time\n{}\nprint(json.dumps({{'protocol':1,'event':'ready','operations':['probe'],'source':'not-opened'}}),flush=True)\nfor line in sys.stdin: time.sleep(0.01)",
                if mode == "slow" { "time.sleep(30)" } else { "pass" })], Duration::from_secs(2))
    }
    #[test]
    fn readiness_survives_the_short_lived_request_thread() {
        let s = fixture("ready");
        let worker = s.clone();
        thread::spawn(move || worker.retry().unwrap())
            .join()
            .unwrap();
        wait(&s, "ready");
        thread::sleep(Duration::from_millis(100));
        assert_eq!(s.snapshot().phase, "ready");
        s.close();
    }

    #[test]
    fn probe_request_accepts_only_current_generation_and_id() {
        let code = r#"import json,sys,time
print(json.dumps({'protocol':1,'event':'ready','operations':['probe'],'source':'not-opened'}),flush=True)
for line in sys.stdin:
 r=json.loads(line)
 print(json.dumps({'protocol':1,'event':'reply','id':r['id'],'generation':r['generation']-1,'result':{'stale':True}}),flush=True)
 time.sleep(0.1)
 print(json.dumps({'protocol':1,'event':'reply','id':r['id'],'generation':r['generation'],'result':{'probe':177}}),flush=True)
"#;
        let s = Supervisor::new(
            PathBuf::from("/usr/bin/python3"),
            vec!["-u".into(), "-c".into(), code.into()],
            Duration::from_secs(2),
        );
        assert!(s.probe().is_err());
        s.retry().unwrap();
        wait(&s, "ready");
        let id = s.probe().unwrap();
        thread::sleep(Duration::from_millis(40));
        assert!(s.snapshot().last_probe.is_none());
        let until = Instant::now() + Duration::from_secs(2);
        while s.snapshot().last_probe.is_none() {
            assert!(Instant::now() < until);
            thread::sleep(Duration::from_millis(10));
        }
        assert_eq!(
            s.snapshot().last_probe.unwrap(),
            json!({"id":id,"result":{"probe":177}})
        );
        s.retry().unwrap();
        assert!(s.snapshot().last_probe.is_none());
        s.close();
    }

    #[test]
    fn incompatible_handshake_fails_instead_of_becoming_ready() {
        let s = Supervisor::new(PathBuf::from("/usr/bin/python3"), vec!["-u".into(), "-c".into(),
            "import time; print('{\"protocol\":2,\"event\":\"ready\"}',flush=True); time.sleep(30)".into()], Duration::from_secs(2));
        s.retry().unwrap();
        let failed = wait(&s, "failed");
        assert_eq!(failed.error.as_deref(), Some("engine-protocol-mismatch"));
        assert!(failed.pid.is_none());
        s.close();
    }

    #[test]
    fn unexpected_exit_is_failed_and_retry_replaces_only_owned_child() {
        let s = fixture("ready");
        s.retry().unwrap();
        let old = wait(&s, "ready");
        unsafe {
            libc::kill(old.pid.unwrap() as i32, libc::SIGKILL);
        }
        let failed = wait(&s, "failed");
        assert_eq!(failed.error.as_deref(), Some("engine-exited"));
        assert!(failed.pid.is_none());
        s.retry().unwrap();
        let new = wait(&s, "ready");
        assert!(new.generation > old.generation);
        assert_ne!(new.pid, old.pid);
        assert!(!std::path::Path::new(&format!("/proc/{}", old.pid.unwrap())).exists());
        s.close();
    }

    #[test]
    fn startup_timeout_reaps_the_owned_child() {
        let s = fixture("slow");
        s.retry().unwrap();
        let pid = s.snapshot().pid.unwrap();
        let failed = wait(&s, "failed");
        assert_eq!(failed.error.as_deref(), Some("engine-ready-timeout"));
        assert!(!std::path::Path::new(&format!("/proc/{pid}")).exists());
        s.close();
    }

    #[test]
    fn close_during_startup_invalidates_late_messages_and_disallows_retry() {
        let s = fixture("slow");
        s.retry().unwrap();
        let pid = s.snapshot().pid.unwrap();
        s.close();
        assert!(!std::path::Path::new(&format!("/proc/{pid}")).exists());
        thread::sleep(Duration::from_millis(50));
        assert_eq!(s.snapshot().phase, "closed");
        assert_eq!(s.retry().unwrap_err(), "window-closed");
    }

    #[test]
    fn ready_child_is_owned_and_close_reaps_it() {
        let s = fixture("ready");
        s.retry().unwrap();
        let ready = wait(&s, "ready");
        let pid = ready.pid.unwrap();
        assert!(std::path::Path::new(&format!("/proc/{pid}")).exists());
        s.close();
        assert_eq!(s.snapshot().phase, "closed");
        assert!(!std::path::Path::new(&format!("/proc/{pid}")).exists());
    }
}
