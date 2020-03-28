import { GudetamaStore } from './GudetamaStore'
import { config } from '../config'

export const store = new GudetamaStore(config.getCacheBackend())
