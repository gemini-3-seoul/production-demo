---
trigger: model_decision
description: When have to change to backend, using this rules.
---

- Nodejs 24, Express, SQLite를 사용하는 레포지토리이다.
- 재사용 가능하도록 controller, model, service, route를 분리하여 관리하여야 하며, 먼저 재사용 가능한 model, service, controller인지 주석 기준으로 검색하고, 없는 경우에만 생성한다.
  - 이때 함수에는 주석을 달아 LLM이 검색하기 용이하도록 하여야 한다. ex) // For LLM: Explain what this function do.
- Restful API로 구현하여 프론트엔드와 상호작용에 용이하도록 작성한다.
- 새로운 route path가 추가될 때마다 API docs가 자동으로 업데이트되도록 하여야 한다.
- 예외 상황이 발생할 수 있다는 것을 항상 염두에 두어야 한다. 따라서 비동기 작업에는 항상 에러 핸들링을 해야 한다.
- 항상 최선의 노력을 다해 두 번 작업하는 일이 없도록 노력한다.