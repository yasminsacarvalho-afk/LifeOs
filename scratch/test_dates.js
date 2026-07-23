const startDate = "2026-06-01";
const endDate = "2026-06-08";

const isIncluded = (dateString) => {
    if (!dateString) return false;
    const dateStr = dateString.replace(" ", "T"); 
    
    const justDate = dateStr.split("T")[0];
    if (startDate && justDate < startDate) return false;
    if (endDate && justDate > endDate) return false;
    return true;
};

console.log("2026-06-01:", isIncluded("2026-06-01"));
console.log("2026-06-08:", isIncluded("2026-06-08"));
console.log("2026-06-09:", isIncluded("2026-06-09"));
console.log("2026-05-31:", isIncluded("2026-05-31"));
