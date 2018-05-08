// Namespacin'
eventstack = window.eventstack || {};

// Retrieve and prefill (form) data:
eventstack.prefill = function(form){
	if(!localStorage.speakerId) {
		return;
	}
	// Constants:
	var DATA_URL = "https://api.eventstack.nl/fronteersconf/speakers/" + localStorage.speakerId + "?" + Date.now();
	var BOOLEAN_FIELDS = ["Books own travel"];
	var IMAGE_FIELDS = ["Photo"];
	var DATETIME_FIELDS = ["Arrives when", "Departs when", "Updated"];
	// Git fetchin':
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
	document.documentElement.setAttribute("data-state", "retrieving");
};

// Submit form data (if a form exists):
eventstack.handle = function(form) {
	form.addEventListener("submit", function(event) {
		event.preventDefault();
		if(!localStorage.speakerId) {
			return;
		}
		fetch(form.action, { method: form.method, body: new FormData(form) })
		.then(function() {
			setTimeout(function() {
				form.setAttribute("data-state", "sent");
				setTimeout(function() { form.removeAttribute("data-state"); }, 3000);
			}, 500);
	 	});
		form.setAttribute("data-state", "sending");
	});
};

// Upload stuff:
(function(uploads) {
	Array.from(uploads).forEach(function(upload) {
		// Constants:
		var UPLOAD_URL = "https://api.eventstack.nl/fronteersconf/speakers/" + localStorage.speakerId + "/photo";
		var PING_URL = "https://hooks.zapier.com/hooks/catch/1590440/f79g2b/?id=" + localStorage.speakerId;
		// Elements:
		var input = upload.querySelector("input");
		var image = upload.querySelector("img");
		var button = upload.querySelector("button");
		// Events:
		button.addEventListener("click", function() { input.click(); });
		input.addEventListener("change", function() {
			image.removeAttribute("src");
			// Display the new image:
			var file = this.files[0];
			var proxy = new Image();
			proxy.addEventListener("load", function() {
				requestAnimationFrame(function() { image.src = proxy.src; });
			});
			proxy.src = URL.createObjectURL(file);
			// Upload the image:
			if(!localStorage.speakerId) {
				return;
			}
			fetch(UPLOAD_URL, { method: "post", body: file })
			.then(function() {
				fetch(PING_URL, { method: "post" });
				setTimeout(function() { upload.setAttribute("data-state", "sent"); }, 500);
			});
			upload.setAttribute("data-state", "sending");
		});
	});
})(document.querySelectorAll("[data-upload]"));

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

// Copy speaker ID from the URL hash to local storage for future reference:
if(location.hash) {
	localStorage.setItem("speakerId", location.hash.substr(1));
	history.replaceState({}, "", location.pathname);
}
if(!localStorage.speakerId) {
	var message = "Oops 😳\n\nIt seems that your speaker ID was not remembered since your previous visit. Please refer to the invitation you received by email and follow your personal speaker dashboard link.";
	requestAnimationFrame(function() { alert(message); });
}
