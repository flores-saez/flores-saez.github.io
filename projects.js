// Active projects (pulled/removed temps excluded).
// Exports are named "<Name>_CSV(<YYYY-MM-DD_HHMMSS>).csv" (timestamp varies each export);
// older Oak Ridge files were "OR_CSV.csv". `match` = accepted filename bases (name + short code).
// The page picks the NEWEST matching file. OR + Cleveland confirmed from live data.
module.exports = [
 // Alonso — long-term monthly
 {code:"OR", name:"Oak Ridge TN", da:"Alonso", tz:"Eastern", type:"Temp I&I", cadence:"14 d", meters:11, rg:3, siteKeyRegex:"OR_\\d+", match:["OR","Oak Ridge","Oak Ridge TN"], note:"Temp I&I — ends 2026-08-14", group:"Temp (active)"},
 {code:"AR", name:"Arab AL", da:"Alonso", tz:"Central", type:"Monthly", cadence:"45 d", meters:5, rg:1, match:["AR","Arab","Arab AL"], note:"Monthly Excel + annual report"},
 {code:"CL", name:"Cleveland TN", da:"Alonso", tz:"Central", type:"Monthly", cadence:"90 d", meters:27, rg:0, match:["CL","Cleveland","Cleveland TN"], note:"Basin/LJA numbering; incl. 2 CCUD"},
 {code:"GV", name:"Goodlettsville TN", da:"Alonso", tz:"Central", type:"Monthly", cadence:"45 d", meters:8, rg:1, match:["GV","Goodlettsville","Goodlettsville TN"], note:"Two billing meters (3 blinds/visit)"},
 {code:"GR", name:"Greenbrier TN", da:"Alonso", tz:"Central", type:"Monthly", cadence:"45 d", meters:2, rg:1, match:["GR","Greenbrier","Greenbrier TN"], note:"Both download-only Iscos"},
 // Alonso — quarterly / yearly
 {code:"TU", name:"Tuscaloosa AL", da:"Alonso", tz:"Central", type:"Quarterly/Yearly", cadence:"30 d", meters:19, rg:5, match:["TU","Tuscaloosa","Tuscaloosa AL"], note:"Yearly Sept–Aug"},
 {code:"COL", name:"Columbia TN", da:"Alonso", tz:"Central", type:"Quarterly", cadence:"45 d", meters:12, rg:3, match:["COL","Columbia","Columbia TN"], note:"DO-NOT-DIE: COL-2360, COL-5866"},
 // Will — long-term
 {code:"JA", name:"Jackson MS", da:"Will", tz:"Central", type:"Monthly", cadence:"90/180 d", meters:36, rg:4, match:["JA","Jackson","Jackson MS"], note:"WBI interceptor + BS billing"},
 {code:"FC", name:"Forsyth Co GA", da:"Will", tz:"Eastern", type:"Monthly", cadence:"30/90 d", meters:19, rg:6, match:["FC","Forsyth","Forsyth Co","Forsyth County","Forsyth Co GA"], note:"Eastern; quarterly visits contractual"},
 {code:"SM", name:"Smyrna TN", da:"Will", tz:"Central", type:"Monthly", cadence:"60 d", meters:12, rg:2, match:["SM","Smyrna","Smyrna TN"], note:""},
 {code:"AU", name:"Auburn AL", da:"Will", tz:"Central", type:"Quarterly/Yearly", cadence:"60 d", meters:17, rg:2, match:["AU","Auburn","Auburn AL"], note:"Q3 carries I&I; RGs 6-hr call"},
 // Active temps
 {code:"OK", name:"Okaloosa Co FL", da:"Alonso", tz:"Central", type:"Temp I&I", cadence:"14 d", meters:6, rg:1, match:["OK","Okaloosa","Okaloosa Co","Okaloosa Co FL"], note:"Ft Walton Beach — ends 2026-09-01", group:"Temp (active)"},
 {code:"USA", name:"USA AL", da:"Alonso", tz:"Central", type:"Temp I&I", cadence:"90 d", meters:3, rg:1, match:["USA","USA AL"], note:"Temp I&I", group:"Temp (active)"},
 {code:"GAT", name:"Gatlinburg TN", da:"Alonso", tz:"Eastern", type:"Temp data-only", cadence:"90 d", meters:1, rg:1, match:["GAT","Gatlinburg","Gatlinburg TN"], note:"Data only — installed 2026-05-27", group:"Temp (active)"},
];
