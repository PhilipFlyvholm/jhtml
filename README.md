# jhtml

Create a html website with the use of JSON instead of the XML format.

*Disclaimer: This project is made for fun and is not intended to be used. Syntax is subject to change*

## How to use
Start by creating a json file and with an empty array. This is the equlivant of a empty html file with only the html tag.

Each tag is represented by a two curly brackets and must have an "tag" name/value pair.
If we want to add children to the tag then we add the "children" name/value pair. This tag must have an array of tags as the value.
Giving a "raw" name/value pair will set the raw content in the tag.
Using any other name in a tag will create an attribute.
```json
[
	{
		"tag": "head",
		"children": [
			{
				"tag": "title",
				"raw": "This is the title."
			},
			{
				"tag": "meta",
                "charset": "utf-8"
			}
		]
	},
	{
		"tag": "body",
		"children": [
			{
				"tag": "h1",
				"raw": "Hello world!"
			}
		]
	}
]
```

## Todo:
- Shorthand for inline tags ({"h1": "Hello world!)
- Inline styling for tags
- Script tag support
- Extern stylesheet tag
- Auto stylesheet creation
- Remove hardcoded file name
- Add --watch for auto compile
