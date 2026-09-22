import fs from "node:fs";
const path = "/home/ubuntu/yks-study-coach/client/src/pages/Home.tsx";
let source = fs.readFileSync(path, "utf8");
const marker = "</div>{view === \"day\" && <Card className=\"soft-card p-5\">";
const replacement = "</div><PlanAdherenceCenter result={adherence} onRefresh={user ? () => refreshCoach.mutate(coachPeriod) : undefined} isRefreshing={refreshCoach.isPending} />{view === \"day\" && <Card className=\"soft-card p-5\">";
if (!source.includes(marker)) throw new Error("Plan Uyum Merkezi yerleştirme noktası bulunamadı");
source = source.replace(marker, replacement);
fs.writeFileSync(path, source);
