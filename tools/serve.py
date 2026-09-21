# 교실·개발용 간단 서버. 고친 파일이 바로 보이도록 캐시를 끈다.
#   python tools/serve.py          → http://127.0.0.1:8777
# 파이썬 기본 http.server 는 no-cache 를 보내지 않아, 고쳐도 옛 파일이 보인다.
import functools, http.server, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *a):            # 404 로그가 쏟아지지 않게
        if len(a) > 1 and str(a[1]).startswith("4"):
            return
        super().log_message(fmt, *a)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    os.chdir(ROOT)
    h = functools.partial(NoCache, directory=ROOT)
    print(f"http://127.0.0.1:{port}/norman/  (멈추려면 Ctrl+C)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), h).serve_forever()
