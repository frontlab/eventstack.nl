// Namespacin'
eventstack = window.eventstack || {};

// Retrieve and prefill (form) data:
eventstack.prefill = function(form){
	if(!localStorage.id) {
		return;
	}
	// Some constants:
	var URL = "https://api.eventstack.nl/fronteersconf/speakers/" + localStorage.id;
	var BOOLEAN_FIELDS = ["Books own travel"];
	var DATETIME_FIELDS = ["Arrives when", "Departs when", "Updated"];
	// Get fetchin':
	document.documentElement.setAttribute("data-state", "retrieving");
	fetch(URL)
	.then(function(response) {
		return response.json();
	})
	.then(function(data) {
		if("error" in data) {
			throw Error("Whale oil beef hooked, thar be an error: " + data.error);
		}
		Object.keys(data.fields).concat(BOOLEAN_FIELDS).forEach(function(key) {
			var id = key.toLowerCase().split(" ").join("-");
			var target = (form && form.elements[id]) || document.querySelector('[data-prefill-id="' + id + '"]');
			if(target) {
				if(BOOLEAN_FIELDS.includes(key)) {
					data.fields[key] && target.querySelector("[data-prefill-true]").removeAttribute("hidden");
					!data.fields[key] && target.querySelector("[data-prefill-false]").removeAttribute("hidden");
				}
				else {
					var value = data.fields[key];
					if(DATETIME_FIELDS.includes(key)) {
						var format = target.getAttribute("data-prefill-format");
						value = fecha.format(new Date(value), format);
					}
					target["value" in target ? "value" : "innerHTML"] = value;
				}
			}
		});
		document.documentElement.setAttribute("data-state", "retrieved");
	});
};

// Submit form data (if a form exists):
eventstack.update = function(form) {
	form && form.addEventListener("submit", function(event) {
		event.preventDefault();
		form.setAttribute("data-state", "sending");
		fetch(form.action, {
			method: form.method,
			body: new FormData(form)
		})
		.then(function() {
			form.setAttribute("data-state", "sent");
		});
	});
};

// Copy speaker ID from the URL hash to local storage for future reference:
if(location.hash) {
	localStorage.id = location.hash.substr(1);
	history.replaceState({}, "", location.pathname);
}

// Do stuff when the escape key is pressed:
(function(toggles) {
	document.addEventListener("keydown", function(event) {
		switch(event.key) {
			case "Escape":
				Array.from(toggles).forEach(function(toggle) {
					toggle.checked = false;
				});
				break;
		}
	})
})(document.querySelectorAll("[data-dialog-toggle]"));
