/\|''Version:''\|/ {version=substr($1,15)} 
$0 == "!Revision history" 	{skip=1}
skip != 1 					{print}
END 						{print \
	"!Source Code\n***/\n/***\nThis plugin's source code is compressed (and hidden). "\
    "Use this [[link|http://tiddlywiki.abego-software.de/archive/org/abego/YourSearchPlugin/"version"/YourSearchPlugin-"version"-src.js]] "\
    "to get the readable source code.\n***/\n///%"}