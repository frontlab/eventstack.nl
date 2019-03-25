#!/usr/bin/env python3

"""
SpeakerDashboard.Name = Person.Name
SpeakerDashboard.Affiliation = Person.Affiliation
SpeakerDashboard.Email = Person.Email
SpeakerDashboard.Phone = Person.Phone
SpeakerDashboard.Twitter = Person.Twitter
SpeakerDashboard.Apparel = Guest.Apparel
SpeakerDashboard.Diet = Guest.Diet
SpeakerDashboard.Country = Speaker.Country
SpeakerDashboard.Bio = Speaker.Bio
SpeakerDashboard.Photo = Speaker.Photo
SpeakerDashboard.TalkTitle = Speaker.TalkTitle
SpeakerDashboard.TalkSummary = Speaker.TalkSummary
"""

import requests
import sys
import terminaltables


BASE_URL = "https://api.airtable.com/v0/appFbcHx3tNEUNrzz"
API_KEY = sys.argv[1] if len(sys.argv) > 1 else input("Airtable API Key: ")


def fetch(path):
	result = requests.get(f"{BASE_URL}{path}?api_key={API_KEY}").json()
	if "fields" in result:
		return result["fields"]
	if "records" in result:
		return [record["fields"] for record in result["records"]]

def row(speaker, key, current, updated, formatter=None):
	return [
		speaker["Name"],
		key,
		formatter(current.get(key, "")) if formatter else current.get(key, ""),
		formatter(updated.get(key, "")) if formatter else updated.get(key, ""),
	]


table = [["Speaker", "Field"]]
speakers = fetch("/Speaker")

for speaker in speakers:
	person = fetch(f'/Person/{speaker["Person"][0]}')
	guest = fetch(f'/Guest/{person["Guest"][0]}')
	dashboard = fetch(f'/Speaker dashboard/{speaker["Speaker dashboard"][0]}')

	if person.get("Name", "") != dashboard.get("Name", ""): table.append([speaker["Name"], "Name"])
	if person.get("Affiliation", "") != dashboard.get("Affiliation", ""): table.append([speaker["Name"], "Affiliation"])
	if person.get("Email", "") != dashboard.get("Email", ""): table.append([speaker["Name"], "Email"])
	if person.get("Phone", "") != dashboard.get("Phone", ""): table.append([speaker["Name"], "Phone"])
	if person.get("Twitter", "") != dashboard.get("Twitter", ""): table.append([speaker["Name"], "Twitter"])
	if guest.get("Apparel", "") != dashboard.get("Apparel",""): table.append([speaker["Name"], "Apparel"])
	if guest.get("Diet", "") != dashboard.get("Diet",""): table.append([speaker["Name"], "Diet"])
	if speaker.get("Country", "") != dashboard.get("Country", ""): table.append([speaker["Name"], "Country"])
	if speaker.get("Bio", "") != dashboard.get("Bio", ""): table.append([speaker["Name"], "Bio"])
	if str(speaker.get("Photo", "")) != str(dashboard.get("Photo", "")): table.append([speaker["Name"], "Photo"])
	if speaker.get("Talk title", "") != dashboard.get("Talk title",""): table.append([speaker["Name"], "Talk title"])
	if speaker.get("Talk summary", "") != dashboard.get("Talk summary",""): table.append([speaker["Name"], "Talk summary"])

print(terminaltables.SingleTable(table).table)
