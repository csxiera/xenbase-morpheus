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

    const controlLabel = "Control";
    const controlSampleID = 200;
    sampleSet.set(controlLabel, controlSampleID);
  
    rows.forEach((row, idx) => {
        const sampleLabel = row["Experiment Name"];
        const markerSymbol = row["Gene"];
        const markerID = row["Model ID"];
        const tpm = parseFloat(row["TPM"]);
        const controlTpm = parseFloat(row["Control TPM"])
  
        // Build sample list (deduped)
        if (!sampleSet.has(sampleLabel)) {
            // make up a numeric sampleID
            sampleSet.set(sampleLabel, 200 + sampleSet.size);
        }
        const sampleID = sampleSet.get(sampleLabel);
    
        // Build marker list (deduped)
        if (!markerSet.has(markerID)) {
            markerSet.set(markerID, markerSymbol);
        }
    
        // Build cellTPM
        if (!cellTPM[markerID]) cellTPM[markerID] = {};
        cellTPM[markerID][sampleID] = tpm;

        // Add control TPM
        cellTPM[markerID][controlSampleID] = controlTpm;
    });

    // Sort genes by highest to lowest LogFC values (first non-control sample only)
    const logFC = rows
    .filter(row => {
      const sampleLabel = row["Experiment Name"];
      const sampleID = sampleSet.get(sampleLabel);
      return sampleID === 201;
    })
    .map(row => ({
      markerID: row["Model ID"],
      logFC: parseFloat(row["LogFC"])
    }))
    .sort((a, b) => b.logFC - a.logFC);

    // Convert maps → arrays like your original
    const sampleList = [...sampleSet.entries()].map(([label, id]) => ({
      label,
      sampleID: id,
    }));
  
    const markerList = logFC.map(({ markerID, logFC }) => ({
      markerID,
      symbol: markerSet.get(markerID),
      logFC
    }));
  
    return { sampleList, markerList, cellTPM };
  }