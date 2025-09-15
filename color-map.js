// Definitions for cell coloring based on average quantile-normalized TPM value.
// Note that colorMap should not contain definitions less than zero.  (Below zero numbers make
// all the cells show up as white.)
var colorMap = [
  { value: 0,
    color: '#E0E0E0'
  },
  { value: 0.0000998,
    color: '#E0E0E0'
  },
  { value: 0.0001000,
    color: '#cdddc9'
  },
  { value: 0.0011500,
    color: '#a4bfa1'
  },
  { value: 0.0022000,
    color: '#6c7d6a'
  },
  { value: 0.1012000,
    color: '#4f5f4e'
  },
  { value: 0.2002000,
    color: '#3b4a3a'
  },
  { value: 0.4001000,
    color: '#2a3528'
  },
  { value: 0.6000000,
    color: '#1a2319'
  },
  { value: 1,
    color: '#000000'
  }
];