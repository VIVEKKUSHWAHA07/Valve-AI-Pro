import * as xlsx from "xlsx";
import * as fs from "fs";

const rfqs = [
  { ID: 1, Description: "Gate Valve 4 inch CL150 WCB RF Gear Operated", Category: "Valve" },
  { ID: 2, Description: "Ball Valve 2 inch 300# CF8M Flanged", Category: "Valve" },
  { ID: 3, Description: "Spiral Wound Gasket 4\" CL150 316/FG", Category: "Gasket" },
  { ID: 4, Description: "Unknown widget thing not matching anything", Category: "Other" }
];

const ws = xlsx.utils.json_to_sheet(rfqs);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
xlsx.writeFile(wb, "test_rfq.xlsx");
console.log("Created test_rfq.xlsx");
