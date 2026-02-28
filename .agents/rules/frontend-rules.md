---
trigger: model_decision
description: When have to change to frontend, using this rules.
---

- Nextjs 15, React 19, Shadcn, Tanstack Query를 사용하는 레포지토리이다.
- 재사용 가능하도록 컴포넌트를 분리하여 관리하여야 하며, 먼저 컴포넌트를 주석 기준으로 검색하고, 없는 경우에만 생성한다.
  - 이때 컴포넌트에는 주석을 달아 LLM이 검색하기 용이하도록 하여야 한다. ex) // For LLM: Explain what this component do.
- Tanstack Query를 사용하여 백엔드와 소통하되, 쿼리의 중복은 절대 없어야 한다.
- 데이터의 CRUD가 이뤄지는 상호작용이 기대되는 작업인 경우, 반드시 Tanstack Query를 이용한 데이터에 refetch가 이뤄지도록 작업하여야 한다.
- 항상 최선의 노력을 다해 두 번 작업하는 일이 없도록 노력한다.