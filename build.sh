# create empty build dir
rm -r -f build
mkdir build

# extract the CHANGELOG text from the sources
awk ' $0 == "!Source Code" {output=0} output == 1 {print} $0 == "!Revision history" {output=1} ' <src/main/javascript/YourSearchPlugin-src.js >build/CHANGELOG.txt

# Build the artifact
awk -f src/build/writeheader.awk < src/main/javascript/YourSearchPlugin-src.js >build/YourSearchPlugin.js
java -jar lib/yuicompressor-2.4.7.jar src/main/javascript/YourSearchPlugin-src.js >>build/YourSearchPlugin.js
echo "" >>build/YourSearchPlugin.js
echo "//%/" >>build/YourSearchPlugin.js
