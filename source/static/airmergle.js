String.prototype.toCamelCase = function() {
	return this.toLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, function(char, index) {
		return !index ? char : char.toUpperCase();
	}).replace(/[^a-z0-9]+/gi, "");
};

(function() {

	// UI elements:
	var UI = Array.from(document.querySelectorAll("[id]")).reduce(function(ui, target) {
		ui[target.id.toCamelCase()] = target;
		return ui;
	}, {});

	var CACHE = {
		records: [],
		index: 0
	};

	var retry = function(count, message, attempt) {
		attempt()
		.then(function() {
			// @debug:
			window.debug && console.log("%c" + message, "color: green;");
		})
		.catch(function(error) {
			if(count > 1) {
				// @debug:
				window.debug && console.log("%c" + message, "color: orange;");
				retry(count - 1, message, attempt);
			}
			else {
				// @debug:
				window.debug && console.log("%c" + message, "color: red;");
				Promise.reject(error);
			}
		});
	};

	// Reset records cache and UI elements:
	var reset = function() {
		CACHE.records = [];
		CACHE.index = 0;
		// Reset table fields:
		UI.fields.innerHTML = "";
		validate();
	};

	// Check input validity and toggle buttons:
	var validate = function() {
		UI.load.disabled = UI.preview.disabled = UI.drafts.disabled = !UI.input.checkValidity();
	};

	// Restore saved input:
	var restore = function(keys) {
		(keys || Object.keys(localStorage)).forEach(function(key) {
			var id = key.split("/").pop();
			Array.from(document.querySelectorAll('#' + id +', [name="' + id + '"]')).forEach(function(input) {
				if(input.type == "checkbox") {
					// Toggle checkbox inputs:
					input.checked = (localStorage[key] == "true");
					input.dispatchEvent(new Event("change", { bubbles: true }));
				}
				else if(input.type == "radio") {
					// Check radio inputs by value:
					if(input.value == localStorage[key]) {
						input.checked = true;
					}
				}
				else if(input.options && input.options.length) {
					// Set value for select inputs, but only if the value is an option:
					var selectedIndex = Array.from(input.options).map(function(option) {
						return option.value;
					}).indexOf(localStorage[key]);
					if(selectedIndex > -1) {
						input.options.selectedIndex = selectedIndex;
					}
				}
				else {
					input.value = localStorage[key];
				}
				input.dispatchEvent(new Event("input", { bubbles: true }));
			});
		});
	};

	var signIn = function() {
		var instance = gapi.auth2.getAuthInstance();
		var signedIn = instance.isSignedIn.get();
		// Sign in if not already so:
		!signedIn && instance.signIn().catch(function(error) { alert(error.error); });
		return signedIn;
	};

	var signedIn = function(signedIn) {
		// Set signed-in state for buttons:
		Array.from(document.querySelectorAll("button[data-signed-in]")).forEach(function(target) {
			target.setAttribute("data-signed-in", signedIn);
		});
		if(signedIn) {
			// Retrieve (a URL for a) user photo and set signed-in state after it has loaded:
			gapi.client.plus.people.get({ userId: "me", fields: "image" })
			.then(function(response) {
				UI.userPhoto.src = response.result.image.url.replace(/sz=[0-9]+/, "sz=120");
			});
			// Retrieve Gmail sender addresses:
			gapi.client.gmail.users.settings.sendAs.list({ userId: "me" })
			.then(function(response) {
				UI.sender.options.length = 0;
				UI.sender.disabled = false;
				response.result.sendAs.forEach(function(sendAs){
					var sender = [sendAs.displayName, " <", sendAs.sendAsEmail, ">"].join("");
					UI.sender.options.add(new Option(sender, sendAs.sendAsEmail, null, sendAs.isDefault));
				});
				restore(["airmergle/sender"]);
			})
		}
		else {
			UI.user.setAttribute("data-signed-in", false);
			UI.sender.options.length = 0;
			UI.sender.disabled = true;
		}
	};

	// Retrieve and cache records:
	var load = function() {
		reset();
		// Check required input:
		if(![UI.key, UI.base, UI.table, UI.view].every(function(input) {
			return input.validity.valid;
		})) {
			return;
		}
		// Go get 'em!
		fetch(
			[UI.base.value, "/", UI.table.value,"?view=", UI.view.value].join(""),
			{headers: {"Authorization": "Bearer " + UI.key.value}}
		)
		.then(function(response) {
			return response.json();
		})
		.then(function(data) {
			if("error" in data) {
				reset();
				throw Error("Whale oil beef hooked, thar be an error: " + data.error);
			}
			// Flatten records to list of field names:
			var names = data.records.reduce(function(names, record) {
				record.fields.ID = record.id;
				Object.keys(record.fields).forEach(function(name) {
					names.add(name);
				});
				return names;
			}, new Set());
			// Transform records field names to camel case:
			data.records = data.records.map(function(record) {
				record.fields.ID = record.id;
				return Object.entries(record.fields).reduce(function(fields, entry) {
					fields[entry[0].toCamelCase()] = entry[1];
					return fields;
				}, {});
			});
			// Cache records for future reference and update UI elements:
			CACHE.records = data.records;
			UI.fields.innerHTML = jsrender.templates(UI.fieldsTemplate)(Array.from(names).sort());
			UI.count.innerHTML = data.records.length;
			restore(["airmergle/name", "airmergle/address"]);
			validate();
		});
	};

	var preview = function(index) {
		CACHE.index = Math.max(Math.min(index, CACHE.records.length - 1), 0);
		var fields = CACHE.records[CACHE.index];
		var name = fields[UI.input.elements.name.value];
		var address = fields[UI.input.elements.address.value];
		// Show the dialog:
		if(UI.previewDialog.hasAttribute("hidden")) {
			UI.previewDialog.removeAttribute("hidden");
			UI.cancel.focus();
		}
		// Fill preview elements:
		UI.recipient.value = [name, " <", address, ">"].join("");
		UI.subject.value = jsrender.templates(UI.subjectTemplate.value)(fields);
		UI.message.value = jsrender.templates(UI.messageTemplate.value)(fields);
		// Set button states:
		UI.first.disabled = UI.previous.disabled = !CACHE.index;
		UI.last.disabled = UI.next.disabled = !!(CACHE.index == (CACHE.records.length - 1));
		UI.current.innerHTML = CACHE.index + 1;
	};

	var draft = function(index) {
		// Build a MIME message:
		var fields = CACHE.records[index];
		var name = fields[UI.input.elements.name.value];
		var address = fields[UI.input.elements.address.value];
		var message = mimemessage.factory({
			contentType: "text/html; charset=utf-8",
			body: markdownit().render(jsrender.templates(UI.messageTemplate.value)(fields))
		});
		message.header("From", UI.sender.value);
		message.header("To", [name, " <", address, ">"].join(""));
		message.header("Subject", jsrender.templates(UI.subjectTemplate.value)(fields));
		// Create a Gmail draft for the signed in user:
		var raw = Base64.encodeURI(message.toString());
		retry(3, address, function () {
			return gapi.client.gmail.users.drafts.create({
				userId: "me",
				message: { raw: raw }
			});
		});
	};

	// Bind buttons and inputs:

	UI.user.addEventListener("click", signIn);
	UI.userSignOut.addEventListener("click", function() {
		setTimeout(function() {
			gapi.auth2.getAuthInstance().signOut();
		}, 250);
	});

	[UI.key, UI.base, UI.table, UI.view].forEach(function(input) {
		input.addEventListener("change", load);
	});

	UI.key.addEventListener("focus", function() { this.type = "text"; });
	UI.key.addEventListener("blur", function() { this.type = "password"; });

	UI.fieldsTags.addEventListener("change", function() {
		UI.fields.setAttribute("data-tags", this.checked);
	});
	UI.fields.addEventListener("click", function(event) {
		if(!event.target.closest("svg")) {
			return;
		}
		var value = event.target.closest("li").getAttribute("data-value");
		var target = UI.messageTemplate;
		var selection = {
			start: target.selectionStart,
			end: target.selectionEnd
		}
		target.value = [target.value.substring(0, selection.start), value, target.value.substring(selection.end)].join("");
		target.selectionStart = selection.start;
		target.selectionEnd = (selection.start + value.length);
		target.focus();
		target.dispatchEvent(new Event("input", { bubbles: true }));
		target.dispatchEvent(new Event("change", { bubbles: true }));
	});
	UI.fields.addEventListener("change", validate);

	UI.load.addEventListener("click", load);

	UI.messageTemplateWrapLines.addEventListener("change", function() {
		UI.messageTemplate.parentNode.setAttribute("data-wrap-lines", this.checked);
		UI.messageTemplate.dispatchEvent(new Event("input"));
	});

	UI.preview.addEventListener("click", function() {
		preview(CACHE.index);
	});

	UI.drafts.addEventListener("click", function() {
		if(!signIn()) {
			return;
		}
		// @debug:
		window.debug && console.group("Creating " + CACHE.records.length + " drafts");
		CACHE.records.forEach(function(record, index) {
			draft(index);
		});
	});

	UI.draft.addEventListener("click", function() {
		if(!signIn()) {
			return;
		}
		// @debug:
		window.debug && console.group("Creating a single draft");
		draft(CACHE.index);
	});

	UI.first.addEventListener("click", function() { preview(0); });
	UI.previous.addEventListener("click", function() { preview(CACHE.index - 1); });
	UI.next.addEventListener("click", function() { preview(CACHE.index + 1); });
	UI.last.addEventListener("click", function() { preview(CACHE.records.length - 1); });

	UI.mailto.addEventListener("click", function(event) {
		event.preventDefault();
		open(["mailto:", encodeURIComponent(UI.recipient.value), "?subject=", encodeURIComponent(UI.subject.value), "&body=", encodeURIComponent(UI.message.value)].join(""));
	});

	UI.cancel.addEventListener("click", function() {
		UI.previewDialog.setAttribute("hidden", "");
		UI.preview.focus();
	});

	// Bind keys:
	UI.messageTemplate.addEventListener("keydown", function(event) {
		switch(event.key) {
			case "Tab":
				if(event.shiftKey || event.altKey) {
					break;
				}
				event.preventDefault();
				var selection = {
					start: this.selectionStart,
					end: this.selectionEnd
				}
				this.value = [this.value.substring(0, selection.start), "\t", this.value.substring(selection.end)].join("");
				this.selectionStart = this.selectionEnd = (selection.start + 1);
				this.dispatchEvent(new Event("input", { bubbles: true }));
				this.dispatchEvent(new Event("change", { bubbles: true }));
				break;
		}
	});

	// Bind, erm... other stuff:
	UI.userPhoto.addEventListener("load", function() {
		requestAnimationFrame(function() { UI.user.setAttribute("data-signed-in", true); });
	});

	document.addEventListener("keydown", function(event) {
		if(UI.previewDialog.hasAttribute("hidden")) {
			return;
		}
		switch(event.key) {
			case "Escape":
				UI.previewDialog.setAttribute("hidden", "");
				UI.preview.focus();
				break;
			case "ArrowLeft":
				preview(CACHE.index - 1);
				break;
			case "ArrowRight":
				preview(CACHE.index + 1);
				break;
		}
	});

	// Store saved input:
	document.body.addEventListener("change", function(event) {
		var input = event.target;
		var value = input.type == "checkbox" ? input.checked : input.value;
		localStorage["airmergle/" + (input.id || input.name)] = value;
	});

	// Setup Google sign-in:
	gapi.load("client:auth2", function() {
		gapi.client.init({
			clientId: "1028687911483-0pcgllsdotnmbrtf7h4qg1679usrdqir.apps.googleusercontent.com",
			discoveryDocs: [
				"https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
				"https://www.googleapis.com/discovery/v1/apis/plus/v1/rest"
			],
			scope: [
				"https://www.googleapis.com/auth/gmail.readonly",
				"https://www.googleapis.com/auth/gmail.compose",
				"https://www.googleapis.com/auth/userinfo.profile"
			].join(" ")
		})
		.then(function() {
			setTimeout(function() {
				var instance = gapi.auth2.getAuthInstance();
				instance.isSignedIn.listen(signedIn);
				signedIn(instance.isSignedIn.get());
			}, 500);
		});
	});

	restore();
	setTimeout(load, 500);

})();

// Trap focus in dialogs 'n' stuff:
Array.from(document.querySelectorAll('[rel="trap"]')).forEach(function(trap) {
	trap.addEventListener("focus", function() {
		var query = 'input:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';
		this.parentNode.querySelector(query).focus();
	});
});

// Magically transform ordinary textarea's into fancy editors with syntax highlighting:
Array.from(document.querySelectorAll("[data-editor]")).forEach(function(container) {

	var UI = {
		source: container.querySelector("textarea, input"),
		target: container.querySelector("code")
	};
	var MAPPING = {
		tokens: [/[&<>]|{{|}}/gi, { "&": "§amp;", "<": "§lt;", ">": "§gt;", "{{": "«•", "}}": "•»" } ],
		placeholders: [ /§|«•|•»/g, { "§": "&", "«•": "{{", "•»": "}}" } ]
	};

	var resize = function() {
		UI.source.style.width = 0;
		UI.source.style.height = 0;
		UI.source.style.width = UI.target.style.width = UI.source.scrollWidth + "px";
		UI.source.style.height = UI.target.style.height = UI.source.scrollHeight + "px";
	};

	var input = function() {
		// Replace syntax markers with placeholders:
		UI.target.innerHTML = UI.source.value.replace(MAPPING.tokens[0], function(match) {
			return MAPPING.tokens[1][match] || match;
		})
		// Wrap entities and template tags:
		.replace(/§amp;([#a-z0-9]+);/gi, '<i class="editor__token editor__token--noisy">&amp;$1;</i>')
		.replace(/«•([^«»\n]*)•»/g, '<i class="editor__token editor__token--bossy">{{$1}}</i>')
		// Re-replace placeholders with original chars, and "special" chars with entities:
		.replace(MAPPING.placeholders[0], function(match) {
			return MAPPING.placeholders[1][match] || match;
		});
		resize();
	};

	// Keep things properly sized and up to date:
	UI.source.addEventListener("input", input);

	input();

});
