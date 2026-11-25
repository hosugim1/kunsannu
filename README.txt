[실행 방법]
1) Node.js 18 이상 설치 후, 이 폴더에서  node server.js  실행
2) 브라우저에서 http://localhost:3000 접속 (login.html로 시작)
   - 공지사항·군산대 신문이 학교 사이트에서 실시간(5분 캐시)으로 표시됩니다.
   - login.html / index.html을 파일로 직접 열면 서버가 없어 저장된 목록(기준 날짜 표시)이 보입니다.

[폴더]
login.html, index.html   화면 뼈대 (index.html은 약 5.9KB)
css/style.css            스타일 전체 (!important 없음)
js/data.js               서비스·통합정보 메뉴·식단·시간표 데이터
js/script.js             화면 동작 (서비스 목록·빠른 정보·통합정보·식단·설정)
js/live.js               실시간 공지·신문·eclass 과제·빠른 정보
js/account.js, extra.js, login.js
server.js                공지·신문을 대신 가져오는 서버, img/

[v3 변경 내용]
- HTML 축소: 서비스 아이콘·설정 목록·통합정보 탭 등 반복 마크업을 js/data.js 데이터로 만들어 JS가 그림 (22.7KB → 5.9KB)
- 기초웹 프로그래밍 1~8주차 교안 규칙 적용
  · 1~4주차: <!doctype html>·lang="ko"·charset·viewport·description, header/nav/main/section/footer 구조,
    제목 계층 h1→h2(건너뜀 없음), 모든 img에 alt, 폼 label for/id 연결,
    div role="button" 대신 네이티브 button(순서 이동 손잡이 포함), 팝업은 native <dialog>
  · 5~6주차: 외부 CSS 한 파일, :root 변수, * { box-sizing: border-box }, 글자·여백은 rem, !important 사용 안 함
  · 7~8주차: sticky 헤더/하단 메뉴, Flexbox(메뉴·카드 내부) + Grid(서비스·카드·통합정보 목록),
    모바일 우선 미디어쿼리 48rem(768px)·64rem(1024px), :focus-visible 윤곽선, 가로 스크롤 없음 확인(375·767·768·1023·1024·1280px)
- 군산대 신문 서비스를 누르면 신문 사이트(press.kunsan.ac.kr)가 열립니다.
- 식단의 "자동" 버튼 글자를 "기본으로 / 기본 표시 중"으로 바꿨습니다(기본 식당은 교직원).

[참고]
- 공지사항 게시판을 "일반 공지"로 바꾸려면 server.js의 NOTICE_URL boardId를 BBS_0000008로 바꾸세요.
- eclass 남은 과제는 로그인이 필요해 예시 데이터입니다.
