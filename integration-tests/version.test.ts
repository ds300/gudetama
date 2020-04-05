import { runIntegrationTest } from './runIntegrationTest'

runIntegrationTest('printing the version', ({ exec }) => {
  it(`is the right bin`, () => {
    expect(
      exec('which', ['gudetama']).output.endsWith('test-bin/gudetama')
    ).toBeTruthy()
  })
  it(`works`, async () => {
    expect(exec('gudetama', ['--version'])).toMatchObject({
      type: 'success',
      output: '0.0.0-test',
    })
  })
})
