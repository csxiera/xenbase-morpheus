// Test sample list
var sampleList = [
	{
		label: 'anterior neural fold|preplacodal ectoderm - NF14',
		replicateID: '201'
	},
	{
		label: 'anterior non-neural ectoderm - NF14',
		replicateID: '202'
	},
	{
		label: 'chordal neural plate border - NF14',
		replicateID: '203'
	}
];

// Test marker list
var markerList = [
  {
    symbol: 'hoxc6.L',
    markerID: 'XBXL10_1g8243',
  },
  {
    symbol: 'alpl.S',
    markerID: 'XBXL10_1g34054',
  },
  {
    symbol: 'LOC108717234',
    markerID: 'XBXL10_1g24540',
  }
];

// Test TPM values
cellTPM = {
  'XBXL10_1g8243': { // hoxc6.L
    201: 0,
    202: 0.126666667,
    203: 53.588
  },
  'XBXL10_1g34054': { // alpl.S
    201: 7.508,
    202: 0.746666667,
    203: 2.26
  },
  'XBXL10_1g24540': { // pax6
    201: 0,
    202: 0,
    203: 0.248
  }
};