/*
Customized version of TinyMCE 5 codesample plugin.

It uses external Prism.js js/css components and supports all languages supported by Prism.

Copyright (C) 2016, Roman Miroshnychenko <roman1972@gmail.com>
Copyright (C) 2019, Ivan Panchenko <ivan.e.panchenko@gmail.com>

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
*/
var DOM = tinymce.dom.DOMUtils.DOM;

function wrapCode(element) {
	element.innerHTML = '<code>' + element.innerHTML + '</code>';
}

function checkLineNumbers(node) {
  var match = node.className.match(/line-numbers/);
  return match != null;
}

function isCodeSample(elm) {
	return elm && elm.nodeName == 'PRE' && elm.className.indexOf('language-') !== -1;
}

function trimArg(predicateFn) {
	return function(arg1, arg2) {
		return predicateFn(arg2);
	};
}

function getLanguages(editor) {
    var defaultLanguages = [
      {text: 'HTML/XML', value: 'markup'},
      {text: 'JavaScript', value: 'javascript'},
      {text: 'CSS', value: 'css'},
      {text: 'PHP', value: 'php'},
      {text: 'Ruby', value: 'ruby'},
      {text: 'Python', value: 'python'},
      {text: 'Java', value: 'java'},
      {text: 'C', value: 'c'},
      {text: 'C#', value: 'csharp'},
      {text: 'C++', value: 'cpp'}
    ];

	var customLanguages = editor.settings.codesample_languages;
	return customLanguages ? customLanguages : defaultLanguages;
}

function insertCodeSample(editor, language, code, checked) {
	editor.undoManager.transact(function() {
		var node = getSelectedCodeSample(editor);

    	var line_numbers = '';
    	if (checked) {
    		line_numbers = ' line-numbers';
    	}

		code = DOM.encode(code);

		if (node) {
			editor.dom.setAttrib(node, 'class', 'language-' + language + line_numbers);
			node.innerHTML = code;
      		wrapCode(node);
      		Prism.highlightElement(node.firstChild);
			editor.selection.select(node);
		} else {
			editor.insertContent('<pre id="__new" class="language-' + language + line_numbers + '">' + code + '</pre>');
			editor.selection.select(editor.$('#__new').removeAttr('id')[0]);
		}
	});
}

function getSelectedCodeSample(editor) {
	var node = editor.selection.getNode();
	if (isCodeSample(node)) {
		return node;
	}

	return null;
}

function getCurrentCode(editor) {
	var node = getSelectedCodeSample(editor);

	if (node) {
		return node.textContent;
	}

	return '';
}

function getCurrentLanguage(editor) {
	var matches, node = getSelectedCodeSample(editor);

	if (node) {
		matches = node.className.match(/language-(\w+)/);
		return matches ? matches[1] : '';
	}

	return '';
}

function getLineNumbers(editor) {
  var node = getSelectedCodeSample(editor);
  if (node) {
    return checkLineNumbers(node);
  }
  return true;
}

function openDialog(editor) {
	editor.windowManager.open({
		title: "Insert/Edit code sample",
		size: 'large',
		body: {
			type : 'panel',
			items: [
			{
				type: 'selectbox',
				name: 'language',
				label: 'Language',
//				maxWidth: 200,
//				value: getCurrentLanguage(editor),
				items: getLanguages(editor)
			},
			{
				type: 'checkbox',
				name: 'line_numbers',
				label: 'Show line numbers'
			},
			{
				type: 'textarea',
				name: 'code',
				label: 'Code view'
			}
			]
		}, 
		initialData: {
			language: getCurrentLanguage(editor),
			line_numbers: getLineNumbers(editor),
			code: getCurrentCode(editor)
	    },
	
		onSubmit: function(api) {
			var data = api.getData();
			insertCodeSample(editor, data.language, data.code, data.line_numbers);
			api.close();
		},
		buttons: [
			{
				type: 'cancel',
				text: 'Close'
			},
			{
				type: 'submit',
				text: 'Save',
				primary: true
			}
		]
	});
}

tinymce.PluginManager.add('codesample', function(editor, pluginUrl) {
	var $ = editor.$;

	editor.on('PreProcess', function(e) {
		$('pre[contenteditable=false]', e.node).
			filter(trimArg(isCodeSample)).
			each(function(idx, elm) {
				var $elm = $(elm), code = elm.textContent;
				$elm.attr('class', $.trim($elm.attr('class')));
				$elm.removeAttr('contentEditable');
				$elm.empty().append($('<code></code>').each(function() {
					// Needs to be textContent since innerText produces BR:s
					this.textContent = code;
				}));
			});
	});

	editor.on('SetContent', function() {
    	var pre_tags = $('pre');

		var unprocessedCodeSamples = pre_tags.filter(trimArg(isCodeSample)).filter(function(idx, elm) {
			return elm.contentEditable !== "false";
		});

		if (unprocessedCodeSamples.length) {
			editor.undoManager.transact(function() {
				unprocessedCodeSamples.each(function(idx, elm) {
					$(elm).find('br').each(function(idx, elm) {
						elm.parentNode.replaceChild(editor.getDoc().createTextNode('\n'), elm);
					});
					elm.contentEditable = false;
					elm.innerHTML = editor.dom.encode(elm.textContent);
					elm.className = $.trim(elm.className);
				});
			});
		}

   		pre_tags.each(function(idx, elm) {
    		if (!elm.getElementsByTagName('code').length) {
				wrapCode(elm);
			}
			Prism.highlightElement(elm.firstChild);
    	});
	});

	editor.addCommand('codesample', function() {
		openDialog(editor);
	});

	editor.ui.registry.addButton('codesample', {
		cmd: 'codesample',
		title: 'Insert/Edit code sample',
		text: 'Code Sample',
		onAction: function() { openDialog(editor); }
	});
    editor.on('dblclick', function (ev) {
      if (isCodeSample(ev.target)) {
        openDialog(editor);
      }
    });

});
