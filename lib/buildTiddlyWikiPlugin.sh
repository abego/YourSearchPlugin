pluginName=$1
targetDir="target"

srcFile="src/main/javascript/$pluginName-src.js"

if [ "$version" = "" ]; then
	version=`"./lib/extractPluginVersion.sh" <$srcFile`
	echo $version
	if [ "$version" == "SNAPSHOT" ]; then
		version="SNAPSHOT."`date "+%Y%m%d.%H%M%S"`
	fi	
fi
echo $version

dest="$targetDir/$pluginName-$version.js"
changeLogFile="$targetDir/$pluginName-$version-CHANGELOG.txt"
rootChangeLogFile="CHANGELOG.txt"
srcFileInTarget="$targetDir/$pluginName-$version-src.js"


# create empty target dir
rm -r -f $targetDir
mkdir $targetDir

# extract the CHANGELOG text from the sources
"./lib/extractRevisionHistory.sh" <$srcFile >$changeLogFile
"./lib/extractRevisionHistory.sh" <$srcFile >$rootChangeLogFile

# Build the plugin
awk -f lib/getPluginHeader.awk pluginName=$pluginName version=$version <$srcFile >$dest
echo "///%" >>$dest
java -jar lib/yuicompressor-2.4.7.jar $srcFile >>$dest
echo "" >>$dest
echo "//%/" >>$dest

# copy the source
cp $srcFile $srcFileInTarget
