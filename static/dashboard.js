// Namespacin'
eventstack = window.eventstack || {};

// Retrieve and prefill (form) data:
eventstack.prefill = function(form){
	if(!localStorage.id) {
		return;
	}
	// Constants:
	var DATA_URL = "https://api.eventstack.nl/fronteersconf/speakers/" + localStorage.id + "?" + Date.now();
	var BOOLEAN_FIELDS = ["Books own travel"];
	var IMAGE_FIELDS = ["Photo"];
	var DATETIME_FIELDS = ["Arrives when", "Departs when", "Updated"];
	// Git fetchin':
	document.documentElement.setAttribute("data-state", "retrieving");
	fetch(DATA_URL)
	.then(function(response) { return response.json(); })
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
				else if(IMAGE_FIELDS.includes(key)) {
					var proxy = new Image();
					proxy.addEventListener("load", function() {
						requestAnimationFrame(function() { target.src = proxy.src; });
					});
					proxy.src = data.fields[key][0].url;
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
eventstack.handle = function(form) {
	form && form.addEventListener("submit", function(event) {
		event.preventDefault();
		form.setAttribute("data-state", "sending");
		fetch(form.action, { method: form.method, body: new FormData(form) })
		.then(function() {
			setTimeout(function() { form.setAttribute("data-state", "sent"); }, 500);
	 	});
	});
};

// Upload stuff:
(function(uploads) {
	Array.from(uploads).forEach(function(upload) {
		// Constants:
		var UPLOAD_URL = "https://api.eventstack.nl/fronteersconf/speakers/" + localStorage.id + "/photo";
		var PING_URL = "https://hooks.zapier.com/hooks/catch/1590440/f79g2b/?id=" + localStorage.id;
		// Elements:
		var input = upload.querySelector("input");
		var image = upload.querySelector("img");
		var button = upload.querySelector("button");
		// Events:
		button.addEventListener("click", function() { input.click(); });
		input.addEventListener("change", function() {
			upload.setAttribute("data-state", "sending");
			image.removeAttribute("src");
			// Display the new image:
			var file = this.files[0];
			var proxy = new Image();
			proxy.addEventListener("load", function() {
				requestAnimationFrame(function() { image.src = proxy.src; });
			});
			proxy.src = URL.createObjectURL(file);
			// Upload the image:
			fetch(UPLOAD_URL, { method: "post", body: file })
			.then(function() {
				fetch(PING_URL, { method: "post" });
				setTimeout(function() { upload.setAttribute("data-state", "sent"); }, 500);
			});
		});
	});
})(document.querySelectorAll("[data-upload]"));

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
				Array.from(toggles).forEach(function(toggle) { toggle.checked = false; });
				break;
		}
	})
})(document.querySelectorAll("[data-dialog-toggle]"));