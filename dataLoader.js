async function loadCSV(path) {
  const response = await fetch(path);
  const text = await response.text();
  return Papa.parse(text, { header: true }).data;
}

export async function loadData() {
    const rows = await loadCSV("DEG-GSE103240.csv");
  
    const sampleSet = new Map();
    const markerSet = new Map();
    const cellTPM = {};
  
    rows.forEach((row, idx) => {
        const sampleLabel = row["Experiment Name"];
        const markerSymbol = row["Gene"];
        const markerID = row["Model ID"];
  
        // Build sample list (deduped)
        if (!sampleSet.has(sampleLabel)) {
            // make up a numeric replicateID if not in CSV
            sampleSet.set(sampleLabel, 200 + sampleSet.size + 1);
        }
        const replicateID = sampleSet.get(sampleLabel);
    
        // Build marker list (deduped)
        if (!markerSet.has(markerID)) {
            markerSet.set(markerID, markerSymbol);
        }
    
        // Build cellTPM
        if (!cellTPM[markerID]) cellTPM[markerID] = {};
        cellTPM[markerID][replicateID] = parseFloat(row["TPM"]);
    });
  
    // Convert maps → arrays like your original
    const sampleList = [...sampleSet.entries()].map(([label, id]) => ({
      label,
      replicateID: id,
    }));
  
    const markerList = [...markerSet.entries()].map(([markerID, symbol]) => ({
      symbol,
      markerID,
    }));
  
    return { sampleList, markerList, cellTPM };
  }