const fetchUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const proxies = [
  `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`,
  `https://api.codetabs.com/v1/proxy?quest=${fetchUrl}`,
];

async function test() {
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy);
      console.log(`[${proxy.substring(0, 30)}...] status: ${res.status}, length: ${res.headers.get('content-length')} or ${res.headers.get('content-type')}`);
    } catch (err) {
      console.log(`[${proxy.substring(0, 30)}...] error: ${err.message}`);
    }
  }
}
test();
