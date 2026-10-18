/**
 * 旧版本首次访问时写入 localStorage 的示例。现在不再自动载入，
 * 仅用于识别并清除已经存在的老副本。
 */
export const SAMPLE_LEFT = JSON.stringify(
  {
    datasetID: 'entire_employment',
    version: 12,
    measures: [
      {
        uniqKey: 'measure_onboard_cnt_month_begin',
        alias: '期初在职人数',
        aggFunc: 'countIf',
        nodeDataType: 'int',
        format: { numFormatType: 'digit', precision: 0 },
      },
      {
        uniqKey: 'measure_leave_rate',
        alias: '月度离职率',
        aggFunc: 'ratio',
        nodeDataType: 'float',
        format: { numFormatType: 'percent', precision: 2 },
      },
    ],
    filters: [
      { fieldID: 'data_date', op: 'eq', timeGranularity: 'month', value: '2026-09' },
      { fieldID: 'employee_type', op: 'in', values: ['正式', '实习'] },
    ],
    display: { theme: 'light', showTotal: true, pageSize: 50 },
    drillMeasure: null,
  },
  null,
  2,
)

export const SAMPLE_RIGHT = JSON.stringify(
  {
    datasetID: 'entire_employment',
    version: 13,
    measures: [
      {
        uniqKey: 'measure_onboard_cnt_month_begin',
        alias: '期初在职人数',
        aggFunc: 'countIf',
        nodeDataType: 'int',
        format: { numFormatType: 'digit', precision: 0 },
      },
      {
        uniqKey: 'measure_leave_rate',
        alias: '月度主动离职率',
        aggFunc: 'ratio',
        nodeDataType: 'float',
        format: { numFormatType: 'percent', precision: 1 },
      },
    ],
    filters: [
      { fieldID: 'data_date', op: 'eq', timeGranularity: 'month', value: '2026-10' },
      { fieldID: 'employee_type', op: 'in', values: ['正式', '实习'] },
    ],
    display: { theme: 'light', showTotal: true, pageSize: 100, freezeHeader: true },
    drillMeasure: null,
  },
  null,
  2,
)
