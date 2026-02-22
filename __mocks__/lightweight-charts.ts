const mockSeries = {
  setData: jest.fn(),
  applyOptions: jest.fn(),
}

const mockChart = {
  addSeries: jest.fn().mockReturnValue(mockSeries),
  applyOptions: jest.fn(),
  timeScale: jest.fn().mockReturnValue({ fitContent: jest.fn(), setVisibleRange: jest.fn(), borderVisible: false }),
  remove: jest.fn(),
  resize: jest.fn(),
  subscribeClick: jest.fn(),
  unsubscribeClick: jest.fn(),
  subscribeCrosshairMove: jest.fn(),
  unsubscribeCrosshairMove: jest.fn(),
}

export const createChart = jest.fn().mockReturnValue(mockChart)
export const ColorType = { Solid: 'solid' }
export const LineStyle = { Solid: 0, Dotted: 1, Dashed: 2 }
export const CrosshairMode = { Normal: 0, Magnet: 1, Hidden: 2 }
export const AreaSeries = {}
