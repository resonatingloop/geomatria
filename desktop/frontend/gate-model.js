import {buildProjectedLoci,getFeatureKey} from "../../atlas/src/atlasData.js";
export function selectedReading(data,selected){
  if(!data||!Number.isInteger(selected)||selected<1||selected>2000)return null;
  const feature=data.features.find(f=>f.properties.value===selected);
  if(!feature)return null;
  const locus=buildProjectedLoci(data).find(l=>l.cliques.some(c=>Number(c.details.value)===selected));
  return locus?{locus,selectedKey:getFeatureKey(feature,data.features.indexOf(feature))}:null;
}
