const KEY = "arcanes_campaign_id";

export const getSelectedCampaignId = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export const setSelectedCampaignId = (id) => {
  try {
    localStorage.setItem(KEY, id || "");
  } catch {
    /* storage unavailable */
  }
};