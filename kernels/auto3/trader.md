Tracer API

  Recording:
  - startRun(metadata) - begin recording a run
  - transform - plug into kernel's transforms array
  - endRun(finalState, handlers) - finish recording, capture state and handler hashes

  Diffing:
  - diffData(runId1, runId2) - what values changed/added/removed
  - diffFlow(runId1, runId2) - what intents were different, sequence match
  - diffCode(runId1, runId2) - what handlers changed/added/removed
  - diff(runId1, runId2) - all three levels combined

  Utilities:
  - getRuns(), getRun(id), clear()
  - summarize(runId) - intent counts, duration, overview
  - hashHandler(), hashHandlers() - stable hashes for code diffing

  Test Coverage

  | Category              | Tests                                                          |
  |-----------------------|----------------------------------------------------------------|
  | Hashing               | 4 tests - deterministic, different fns differ, policy included |
  | Single kernel tracing | 4 tests - records intents, state, hashes, multiple runs        |
  | Data diff             | 3 tests - changed, added, unchanged values                     |
  | Flow diff             | 2 tests - same/different sequences                             |
  | Code diff             | 3 tests - changed, added, removed handlers                     |
  | Multi-block           | 2 tests - flow through wired blocks, diff different inputs     |
  | Summary               | 1 test - run overview                                          |
  | Full diff             | 1 test - all three levels combined                             |

  Next Steps (from NEXT.md)

  The tracer currently needs manual integration. Potential improvements:
  1. Auto-inject tracer into blocks
  2. Cross-block intent correlation (trace an intent through multiple blocks)
  3. Persistent storage for traces
  4. Visual diff output