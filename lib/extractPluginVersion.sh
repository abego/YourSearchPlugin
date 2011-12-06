# The input stream is in TiddlyWiki Plugin source file format with standard 
# plugin header and version entry like this:
#
# |''Version:''|2.1.5 (2011-12-05)|
#
# The tool returns the version number ("2.1.5" in the example).
#
# A whitespace must follow the version number, but no whitespace must be
# before the version number.
#
awk "/\|''Version:''\|/ {{print substr(\$1,15)};exit}"
