function parseRow(row) {
  return {
    ...row,
    cloud_drives: typeof row.cloud_drives === 'string' ? (() => {
      try { return JSON.parse(row.cloud_drives); } catch { return []; }
    })() : (row.cloud_drives || [])
  };
}

module.exports = parseRow;
