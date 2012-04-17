# Input Stream: abego TiddlyWiki Plugin Source format (including "Revision history")
# 
# Input Variables:
# -v pluginName=... # e.g. "YourSearchPlugin"
# -v version=""     # e.g. "1.5.3", or "SNAPSHOT..."
#
# Output: the PluginHeader for the given plugin and version
#
#
# The PluginHeader consists of:
#
# - all text of the plugin-src.js up to the "!Revision history" line, plus
#
# - an extra "!Source Code", explaining the plugin's code is compressed 
#   and providing a link to the "full" source code version.
#
#   SNAPSHOT versions have an "NOT FOR RELEASE" note instead of the
#   link to the source file

/!Revision history/ {
	skip=1
}
	
skip != 1 {
	print
}

END {
	print "!Source Code\n***/\n/***\nThis plugin's source code is compressed (and hidden). "
	if (version ~ "SNAPSHOT") {
		print "!NOT FOR RELEASE (Development Snapshot)"
		print "This is a development version, not intended for release. \n\n''Please, don't distribute it.''"
	} else {
		print "Use this [[link|http://tiddlywiki.abego-software.de/archive/"pluginName"/"version"/"pluginName"-"version"-src.js]] to get the readable source code."
	}
	print "***/"
}