import { HypothesisRepository } from '@oe/database';

export class HypothesisEngineService {
  constructor(private readonly repository = new HypothesisRepository()) {}
  async generate(limit = 200) {
    return this.repository.generate(limit);
  }
}
