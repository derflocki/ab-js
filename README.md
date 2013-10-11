# ab-js

Benchmark your HTTP server – in your browser.


## Demo
Check it out at [http://derflocki.github.io/ab-js](http://derflocki.github.io/ab-js/).

## How it works
Access to resouces via `XMLHttpRequest` and `<iframe>` is restricted by the [same-origin policy](http://en.wikipedia.org/wiki/Same-origin_policy). So, to get things done across domains **ab-js** uses the simple fact, that `<img>` is not!

And since all of this is running in the Browser, benchmarking protected pages just works (after you've logged in of course).
