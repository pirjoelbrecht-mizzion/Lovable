export type Mission = {
  id:string; title:string; tagline:string; description:string; tags:string[];
};
export const MISSIONS:Mission[] = [
  { id:"base", title:"Base Builder (8w)", tagline:"Consistency > intensity", description:"Easy mileage, strides, light hills.", tags:["Z2","Strides","Consistency"] },
  { id:"5k10k", title:"5k–10k Speed (6w)", tagline:"Leg speed & fun workouts", description:"Short intervals, hills, fast finishes.", tags:["Speed","Hills","Fun"] },
  { id:"50k", title:"Trail 50k (12w)", tagline:"Time-on-feet & vert", description:"Long runs on trails, power hiking.", tags:["Trail","Vert","Fueling"] },
  { id:"100m", title:"100 Mile (12w)", tagline:"Steady resilience", description:"Big weekends, downhills, fueling practice.", tags:["Ultra","Downhills","Fueling"] },
  { id:"earth", title:"Run for Earth", tagline:"Eco missions", description:"Plogging, route clean-ups, local trails.", tags:["Community","Eco"] },
  { id:"calm", title:"Mind-Run", tagline:"Quiet mode", description:"Mindful easy runs & recovery prompts.", tags:["Balance","Well-being"] }
];
