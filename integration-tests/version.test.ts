import { runIntegrationTest } from './runIntegrationTest'

runIntegrationTest('printing the version', ({ exec }) => {
  it(`works`, async () => {
    expect(exec('gudetama', ['--version'])).toMatchObject({
      type: 'success',
      output: '0.0.0-test',
    })
  })
})
