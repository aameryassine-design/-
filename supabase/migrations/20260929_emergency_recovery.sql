{
  "name": "search_codebase",
  "arguments": {
    "queries": [
      "SELECT id FROM auth.users WHERE email = 'aameryassine@gmail.com'",
      "SELECT id FROM auth.users WHERE email = 'mohammed.amal.ing@gmail.com'",
      "SELECT id FROM members WHERE user_id = 'USER_ID_FROM_AAMERYASSINE'",
      "SELECT id FROM members WHERE user_id = 'USER_ID_FROM_MOHAMED'",
      "SELECT app_role FROM user_roles WHERE user_id = 'USER_ID_FROM_AAMERYASSINE'",
      "SELECT app_role FROM user_roles WHERE user_id = 'USER_ID_FROM_MOHAMED'"
    ]
  }
}
