/**
 * Two revisions of the same report config. The right side reorders keys and
 * array items on purpose: only the real edits should show up as differences.
 */
export const DIFF_SAMPLE_LEFT = JSON.stringify(
  {
    datasetID: 'entire_employment',
    version: 12,
    owner: { name: '杨文锋', team: 'CoreHR' },
    measures: [
      {
        uniqKey: 'measure_onboard_cnt_month_begin',
        alias: '期初在职人数',
        aggFunc: 'countIf',
        format: { numFormatType: 'digit', precision: 0 },
      },
      {
        uniqKey: 'measure_leave_rate',
        alias: '月度离职率',
        aggFunc: 'ratio',
        format: { numFormatType: 'percent', precision: 2 },
      },
      {
        uniqKey: 'measure_headcount_avg',
        alias: '平均在职人数',
        aggFunc: 'avg',
        format: { numFormatType: 'digit', precision: 1 },
      },
    ],
    tags: ['人力', '月报', '在职'],
    display: { theme: 'light', showTotal: true, pageSize: 50 },
    drillMeasure: null,
  },
  null,
  2,
)

export const DIFF_SAMPLE_RIGHT = JSON.stringify(
  {
    version: 13,
    datasetID: 'entire_employment',
    measures: [
      {
        alias: '月度主动离职率',
        uniqKey: 'measure_leave_rate',
        aggFunc: 'ratio',
        format: { precision: 1, numFormatType: 'percent' },
      },
      {
        uniqKey: 'measure_onboard_cnt_month_begin',
        alias: '期初在职人数',
        aggFunc: 'countIf',
        format: { numFormatType: 'digit', precision: 0 },
      },
      {
        uniqKey: 'measure_transfer_cnt',
        alias: '调动人数',
        aggFunc: 'count',
        format: { numFormatType: 'digit', precision: 0 },
      },
    ],
    owner: { team: 'CoreHR', name: '杨文锋' },
    tags: ['月报', '人力', '在职'],
    display: { pageSize: '50', showTotal: true, theme: 'light', freezeHeader: true },
    drillMeasure: null,
  },
  null,
  2,
)
