export function loadData(rows) {
    const sampleSet = new Map();
    const markerSet = new Map();
    const cellTPM = {};

    const controlLabel = "Control";
    const controlSampleID = 200;
    sampleSet.set(controlLabel, controlSampleID);

    rows.forEach((row) => {
        const sampleLabel = row["binName"];      // sample label
        const markerSymbol = row["geneSymbol"];  // gene symbol
        const markerID = row["modelId"];         // marker ID
        const tpm = parseFloat(row["tpmAvgVal"]);
        const controlTpm = parseFloat(row["ctrlTpmAvgVal"]);

        // Deduplicate samples
        if (!sampleSet.has(sampleLabel)) {
            sampleSet.set(sampleLabel, 200 + sampleSet.size);
        }
        const sampleID = sampleSet.get(sampleLabel);

        // Deduplicate markers
        if (!markerSet.has(markerID)) {
            markerSet.set(markerID, markerSymbol);
        }

        // Populate cellTPM
        if (!cellTPM[markerID]) cellTPM[markerID] = {};
        cellTPM[markerID][sampleID] = tpm;
        cellTPM[markerID][controlSampleID] = controlTpm;
    });

    // Sort genes by LogFC for first non-control sample (sampleID 201)
    const logFC = rows
        .filter(row => sampleSet.get(row["binName"]) === 201)
        .map(row => ({
            markerID: row["modelId"],
            logFC: parseFloat(row["logFC"])
        }))
        .sort((a, b) => b.logFC - a.logFC);

    // Convert maps → arrays
    const sampleList = [...sampleSet.entries()].map(([label, id]) => ({
        label,
        sampleID: id
    }));

    const markerList = logFC.map(({ markerID, logFC }) => ({
        markerID,
        symbol: markerSet.get(markerID),
        logFC
    }));

    return { sampleList, markerList, cellTPM };
}

/*
const testData = [
    {
        binName: "Sample 1",
        geneSymbol: "GeneA",
        modelId: "M1",
        logFC: "2.5",
        tpmAvgVal: "10",
        ctrlTpmAvgVal: "5",
        fDr: "0.01"
    },
	{
        binName: "Sample 1",
        geneSymbol: "GeneB",
        modelId: "M1",
        logFC: "2.5",
        tpmAvgVal: "10",
        ctrlTpmAvgVal: "5",
        fDr: "0.01"
    },
    {
        binName: "Sample 2",
        geneSymbol: "GeneA",
        modelId: "M2",
        logFC: "1.5",
        tpmAvgVal: "20",
        ctrlTpmAvgVal: "10",
        fDr: "0.05"
    },
	{
        binName: "Sample 2",
        geneSymbol: "GeneB",
        modelId: "M2",
        logFC: "1.5",
        tpmAvgVal: "20",
        ctrlTpmAvgVal: "10",
        fDr: "0.05"
    }
];
renderHeatmap(testData);
*/