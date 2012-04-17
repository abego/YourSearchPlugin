pluginName=$1
targetDir="target"

srcFile="src/main/js/$pluginName-src.js"

if [ "$version" = "" ]; then
	version=`"./lib/pluginTools/extractPluginVersion.sh" <$srcFile`
	if [ "$version" == "SNAPSHOT" ]; then
		version="SNAPSHOT."`date "+%Y%m%d.%H%M%S"`
	fi	
fi
echo "Building $pluginName $version"

versionDir="$targetDir/$version"
latestDir="$targetDir/latest"

dest="$versionDir/$pluginName-$version.js"
changeLogFile="$versionDir/$pluginName-$version-CHANGELOG.txt"
rootChangeLogFile="CHANGELOG.txt"
srcFileInTarget="$versionDir/$pluginName-$version-src.js"

# create empty target dir
rm -r -f $targetDir
mkdir $targetDir
mkdir "$versionDir"

# create the artifacts in the "$targetDir/$version" directory

# --- extract the CHANGELOG text from the sources
"./lib/pluginTools/extractRevisionHistory.sh" <$srcFile >$changeLogFile
cp $changeLogFile $rootChangeLogFile

# --- build the plugin
awk -f lib/pluginTools/getPluginHeader.awk pluginName=$pluginName version=$version <$srcFile >$dest
echo "///%" >>$dest
java -jar lib/pluginTools/yuicompressor-2.4.7.jar $srcFile >>$dest
echo "" >>$dest
echo "//%/" >>$dest

# --- copy the source file
cp $srcFile $srcFileInTarget

# create a copy of the artifacts in the "latest" directory (without version number)

mkdir "$latestDir"
cp $srcFileInTarget "$latestDir/$pluginName-src.js"
cp $dest "$latestDir/$pluginName.js"
cp $changeLogFile "$latestDir/$pluginName-CHANGELOG.txt"


