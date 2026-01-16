# PR Code Review Resolver

PR URL이 주어지면 해당 PR의 모든 코드 리뷰 코멘트를 확인하고 수정합니다.

## Instructions

1. **PR 정보 가져오기**: `gh` CLI를 사용하여 PR의 리뷰 코멘트를 모두 가져옵니다.

2. **리뷰 코멘트 분석**: 각 리뷰 코멘트의 내용을 분석합니다:

   - 파일 경로
   - 라인 번호
   - 리뷰어의 요청 사항
   - 코드 변경이 필요한지 여부

3. **코드 수정**: 각 리뷰 코멘트에 대해:

   - 해당 파일을 읽습니다
   - 리뷰어의 피드백에 따라 코드를 수정합니다
   - 수정이 불가능하거나 추가 논의가 필요한 경우 사용자에게 알립니다

4. **결과 보고**: 모든 수정 사항을 요약하여 보고합니다.

## Input

$ARGUMENTS - PR URL 또는 PR 번호 (예: https://github.com/owner/repo/pull/123 또는 123)

## Execution Steps

### Step 1: PR 정보 파싱

```bash
# PR URL에서 정보 추출 또는 PR 번호 직접 사용
```

### Step 2: 리뷰 코멘트 가져오기

다음 명령어들을 사용하여 PR의 모든 리뷰 코멘트를 가져옵니다:

```bash
# PR 리뷰 코멘트 (코드에 직접 달린 코멘트)
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments

# PR 리뷰 자체 (approve, request changes 등과 함께 달린 코멘트)
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews
```

### Step 3: 각 코멘트 처리

각 리뷰 코멘트에 대해:

1. `path` 필드에서 파일 경로 확인
2. `line` 또는 `original_line` 필드에서 라인 번호 확인
3. `body` 필드에서 리뷰 내용 확인
4. `diff_hunk` 필드에서 컨텍스트 확인
5. 해당 파일을 읽고 리뷰 내용에 따라 수정

### Step 4: 수정 적용

- Read 도구로 해당 파일 읽기
- Edit 도구로 리뷰어의 피드백에 따라 수정
- 각 수정 사항을 TodoWrite로 추적

### Step 5: 결과 보고

수정된 내용을 요약하여 보고:

- 수정된 파일 목록
- 각 파일에서 변경된 내용
- 수정하지 못한 코멘트와 그 이유

## Notes

- 리뷰 코멘트가 단순 질문이나 칭찬인 경우 코드 수정이 필요 없습니다
- 리뷰어의 의도가 불명확한 경우 사용자에게 확인을 요청합니다
- CLAUDE.md의 코딩 컨벤션을 준수합니다
