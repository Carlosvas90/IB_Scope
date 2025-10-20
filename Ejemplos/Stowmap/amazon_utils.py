import csv
import sys

import requests
from requests_kerberos import HTTPKerberosAuth, OPTIONAL
from urllib3 import disable_warnings

import time
import os


# Author: Nagi, Karan (karanagi@amazon.com)


class AmazonRequest:
    def __init__(self):
        """
        An object of this instance can send kerberos authenticated requests to Amazon Internal sites.
        Contains a retry method when the site needs midway authentication.
        """

        # Disabling warnings for unverified HTTPS requests
        disable_warnings()

        # Creating a requests.Session() object
        self.req = requests.Session()
        self.req.auth = HTTPKerberosAuth(mutual_authentication=OPTIONAL)
        self.req.verify = False
        self.cookie = None

    def mw_cookie(self, flags=None, delete_cookie: bool = False):
        """
        Checks if the cookie file exists in the .midway folder in the userprofile location.
        It then validates the cookie making sure it is not expired.
        It uses OTP authentication to make the cookie reusable for 20 hrs.

        :return: A cookie list that can used with a requests.Session()
        """
        # Setting defaults for midway cookie location
        if flags is None:
            flags = ["-o", "--aea"]
        path = os.path.join(os.path.expanduser("~"), ".midway")
        cookie = os.path.join(path, "cookie")

        if delete_cookie:
            os.remove(cookie)

        if not os.path.exists(cookie):
            os.system(f"mwinit {' '.join(flags)}")

        with open(cookie, "rt") as c:
            cookie_file = c.readlines()

        cookies = {}
        # Opening the file and looking at timestamp for expired cookie, running mwinit -o again or getting the cookie
        now = time.time()
        for line in range(4, len(cookie_file)):
            if int(cookie_file[line].split("\t")[4]) < now:
                os.system(f"mwinit {' '.join(flags)}")
                return self.mw_cookie(flags=flags)
            cookies[cookie_file[line].split("\t")[5]] = str.replace(
                cookie_file[line].split("\t")[6], "\n", ""
            )
        return cookies

    def set_mw_cookie(self, flags=None, delete_cookie: bool = False):
        """
        Sets the cookie for the requests.Session() object.
        """
        self.cookie = self.mw_cookie(flags=flags, delete_cookie=delete_cookie)

    def send_req(self, url: str, method: str = "GET", needs_midway: bool = True, **options):
        """
        Sends a request to the url provided using the method provided.
        If the request fails, it will retry the request after authenticating with midway.
        If the request fails again, it will raise an exception.

        Example: To send a GET request to a url with a query string
        send_req("https://www.amazon.com", "GET", params={"q": "test"})

        Example: To send a GET request to a url with headers and parameters
        send_req("https://www.amazon.com", "GET", headers={"Content-Type": "application/json"}, params={"q": "test"})

        Example: To send a POST request to a url with a json body
        send_req("https://www.amazon.com", "POST", json={"test": "test"})

        Example: To send a POST request to a url with a form body
        send_req("https://www.amazon.com", "POST", data={"test": "test"})

        Example: To send a POST request to a url with a form body and a file
        send_req("https://www.amazon.com", "POST", data={"test": "test"}, files={"file": open("test.txt", "rb")})

        :param url: The url to send the request to.
        :param method: The method to use for the request. (GET, POST, PUT, DELETE)
        :param needs_midway: If the request needs midway authentication.
        :param options: Any additional options to pass to the request. (headers, cookies, data, params, etc.)
        :return: The response from the request.
        """
        if needs_midway:
            self.set_mw_cookie()
        # Dynamically calling the method from the requests.Session() object
        # and passing the options to the method.
        response = getattr(self.req, method.lower())(
            url, cookies=self.cookie, **options)

        # If the request fails, it will retry the request after authenticating with midway.
        if response.status_code == 401 and 'mwinit' in response.text.lower():
            if needs_midway:
                self.cookie = self.mw_cookie(delete_cookie=True)
                response = getattr(self.req, method.lower())(
                    url, cookies=self.cookie, **options)
            else:
                print("The request needs midway authentication.")
                self.cookie = self.mw_cookie()
                response = getattr(self.req, method.lower())(
                    url, cookies=self.cookie, **options)
        # If the request fails again, it will raise an exception.
        if response.status_code == 401 and 'mwinit' in response.text.lower():
            raise Exception("The request failed to authenticate with midway.")
        return response

    def authenticate_web_menu(self, fc: str):
        """
        Authenticates the user with the web menu for a given fc.

        :param fc: The fc to authenticate with.
        :return: The response from the request.
        """
        # Getting current username
        username = os.getlogin()
        user = (
            self.send_req(
                "https://fclm-portal.amazon.com/ajax/partialEmployeeSearch?term=" + os.getlogin(),
                "GET",
                False,
            )
        ).json()["value"][0]
        badge = user["badgeBarcodeId"]
        url = "http://fcmenu-iad-regionalized.corp.amazon.com/do/login"
        payload = {"badgeBarcodeId": badge}
        with requests.Session() as session:
            session.verify = False
            session.post(url, params=payload)
        self.req = session

    def chime(self, message: str, uri: str, here: bool = False, urgent: bool = False):
        """
        Sends a chime message to a pre-made chime webhook

        :param message: The message that needs to be displayed
        :param uri: The URL for the Chime Webhook
        :param here: A boolean when true appends @present to the message
        :param urgent: A boolean when true appends @all to the message
        """
        if urgent:
            message += "\n\n@all"
        elif here:
            message += "\n\n@present"

        requests.post(url=uri, json={"Content": message})


def import_csv(file_name: str):
    """
    A quick function to import a csv as a list of rows as string

    :param file_name: The name of the csv file to import
    :return: A list of rows obtained from the file as strings
    """
    rows = []
    with open(file_name, newline="") as f:
        reader = csv.reader(f)
        try:
            for row in reader:
                rows.append(row)
            return rows
        except csv.Error as e:
            sys.exit("file {}, line {}: {}".format(file_name, reader.line_num, e))


if __name__ == "__main__":
    request = AmazonRequest()
    response = request.send_req("https://sim.amazon.com/", "GET", needs_midway=False)
    print(response.status_code)

