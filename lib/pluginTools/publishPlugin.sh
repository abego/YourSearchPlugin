if [ ! "$publishedAbegoExtensionsArchive" ]; then
	echo "ERROR: Cannot find central plugin archive. Variable publishedAbegoExtensionsArchive undefined."
	exit 1
fi


pluginName=$1
targetDir="target"

srcFile="src/main/js/$pluginName-src.js"

if [ "$version" = "" ]; then
	version=`"./lib/pluginTools/extractPluginVersion.sh" <$srcFile`
	if [ "$version" == "SNAPSHOT" ]; then
		version="SNAPSHOT."`date "+%Y%m%d.%H%M%S"`
	fi	
fi

versionDir="$targetDir/$version"
latestDir="$targetDir/latest"

if [ ! -e "$versionDir" ]; then
	echo "ERROR: did not find '$versionDir' (contains stuff to publish)."
	exit 2
fi
if [ ! -e "$latestDir" ]; then
	echo "ERROR: did not find '$latestDir' (contains stuff to publish)."
	exit 3
fi

destDir="$publishedAbegoExtensionsArchive/$pluginName"

if [ ! -e "$destDir" ]; then
	mkdir "$destDir"
fi
if [ ! -e "$destDir/$version" ]; then
	mkdir "$destDir/$version"
fi
cp -r "$versionDir" "$destDir"

if [ ! -e "$destDir/latest" ]; then
	mkdir "$destDir/latest"
fi
cp -r "$latestDir" "$destDir"


echo "Published $pluginName $version to central plugin archive (as latest)"

# check if the index.html has a reference to the "new" version
if [ `grep -c "\-$version\.js" "$destDir/index.html"` == "0" ]; then
	echo "ERROR: the index.html file has no link to version $version"
	exit 4
fi
