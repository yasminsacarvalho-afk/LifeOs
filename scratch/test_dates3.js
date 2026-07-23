const startDate = "2026-07-01";
const endDate = "2026-07-08";

const isIncluded = (dateString) => {
    if (!dateString) return false;
    const dateStr = dateString.replace(" ", "T"); 
    
    const justDate = dateStr.split("T")[0];
    if (startDate && justDate < startDate) return false;
    if (endDate && justDate > endDate) return false;
    return true;
};

console.log("2026-07-01:", isIncluded("2026-07-01"));
console.log("2026-07-01 12:00:00:", isIncluded("2026-07-01 12:00:00"));
