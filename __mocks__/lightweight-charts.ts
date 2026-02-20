const mockSeries = {
  setData: jest.fn(),
  applyOptions: jest.fn(),
}

const mockChart = {
  addSeries: jest.fn().mockReturnValue(mockSeries),
  applyOptions: jest.fn(),
  timeScale: jest.fn().mockReturnValue({ fitContent: jest.fn(), borderVisible: false }),
  remove: jest.fn(),
  resize: jest.fn(),
}

export const createChart = jest.fn().mockReturnValue(mockChart)
export const ColorType = { Solid: 'solid' }
export const LineStyle = { Solid: 0 }
export const AreaSeries = {}
