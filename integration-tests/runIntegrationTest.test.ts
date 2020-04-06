import { runIntegrationTest } from './runIntegrationTest'

runIntegrationTest('gudetama in integration tests', ({ gudetama }) => {
  let numTimesExecuted = 0
  it(`is the right bin`, () => {
    expect(gudetama).toMatch('test-bin/gudetama-test-')
  })
  afterAll(() => {
    expect(numTimesExecuted).toBe(2)
  })
})
