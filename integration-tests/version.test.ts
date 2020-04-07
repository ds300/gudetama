import { runIntegrationTest } from './runIntegrationTest'

runIntegrationTest('printing the version', ({ spawn: exec, gudetama }) => {
  it(`works`, async () => {
    expect(exec(gudetama, ['--version'])).toMatch('0.0.0-test')
  })
})
