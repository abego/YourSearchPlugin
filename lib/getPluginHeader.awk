# Input Stream: abego TiddlyWiki Plugin Source format (including "Revision history")
# 
# Input Variables:
# -v pluginName=... # e.g. "YourSearchPlugin"
# -v version=""     # e.g. "1.5.3", or "SNAPSHOT..."
#
# SNAPSHOT versions will emit an "NOT FOR RELEASE" comment instead of the
# link to the source file

$0 == "!Revision history" {
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
		print "Use this [[link|https://raw.github.com/abego/"pluginName"/master/repo/org/abego/YourSearchPlugin/"version"/"pluginName"-"version"-src.js]] to get the readable source code."
	}
	print "***/"
}