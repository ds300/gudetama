export function createInstallScript({ releaseTag }: { releaseTag: string }) {
  return `
  set -e
mkdir -p ~/.gudetama/bin
curl -s -L https://github.com/artsy/gudetama/releases/download/${releaseTag}/gudetama.${releaseTag}.js.gz | gunzip > ~/.gudetama/bin/gudetama
chmod +x ~/.gudetama/bin/gudetama
if [[ -z "$BASH_ENV" ]]
then
  >&2 echo 'Cannot find BASH_ENV environment variable'
  exit 1
else
  echo 'export PATH=$PATH:~/.gudetama/bin' >> "$BASH_ENV"
fi
echo -e 'gudetama successfuly installed at ~/.gudetama/bin/gudetama'
`
}
