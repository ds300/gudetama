<p align="center">
  <img width="227" alt="gudetama" src="https://user-images.githubusercontent.com/1242537/78023111-fa76ff00-734d-11ea-9565-fdcdf9ac9b23.png">

  <h1 align="center" border="none">gudetama</h1>
  <h4 align="center">Next-level CI optimization for supremely lazy (and fast) builds</h4>
</p>

## what

`gudetama` lets you avoid re-running steps in your CI pipeline when there's no need to run them again.

## but how

You specify exactly which inputs dictate the outcome of a CI step. The inputs can be files, env vars, tool versions, or anything. During a build, right before running the step, `gudetama` checks the current values of those things against the values on a previous successful build. If any of them changed it tells you exactly which ones, and then re-runs the step. If none of them changed `gudetama` skips running the step. If any files were supposed to be generated and passed to later steps, `gudetama` will restore them from a cache of the previous build.

## project status

Extremely WIP

## installing on CI

Add this to the start of your CI script

<!-- the_installation_command_is_on_the_next_line -->
    curl -s https://raw.githubusercontent.com/artsy/gudetama/2d1a78fcce4ea5a2e9edead74c4a66a47ba4d77e/install.sh | source /dev/stdin

## about artsy

<a href="https://www.artsy.net/">
  <img align="left" src="https://avatars2.githubusercontent.com/u/546231?s=200&v=4"/>
</a>

This project is the work of engineers at [Artsy][footer_website], the world's
leading and largest online art marketplace and platform for discovering art.
One of our core [Engineering Principles][footer_principles] is being [Open
Source by Default][footer_open] which means we strive to share as many details
of our work as possible.

You can learn more about this work from [our blog][footer_blog] and by following
[@ArtsyOpenSource][footer_twitter] or explore our public data by checking out
[our API][footer_api]. If you're interested in a career at Artsy, read through
our [job postings][footer_jobs]!

[footer_website]: https://www.artsy.net/
[footer_principles]: culture/engineering-principles.md
[footer_open]: culture/engineering-principles.md#open-source-by-default
[footer_blog]: https://artsy.github.io/
[footer_twitter]: https://twitter.com/ArtsyOpenSource
[footer_api]: https://developers.artsy.net/
[footer_jobs]: https://www.artsy.net/jobs
