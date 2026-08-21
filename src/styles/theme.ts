// theme/themeConfig.ts
import type { ThemeConfig } from "antd";

const theme: ThemeConfig = {
    token: {
        colorPrimary: "#54B226", //primary color for entire app
        colorBgContainer: "#FFF", //Container background color, e.g: default button, input box, etc. Be sure not to confuse this with colorBgElevated.
        colorBgSpotlight: "#54B226", // background color of Tooltip.
        colorBorder: "#bfbfbf", //Default border color, used to separate different elements, such as: form separator, card separator, etc.
        colorPrimaryBg: "rgba(84, 178, 38,1)", // Light background color of primary color, usually used for weak visual level selection state such as menu item selected state
        colorBgBase: "#fff", //used for divider , but also for modal so need to set bg to white in modal
        borderRadius: 6,
        padding: 16,
        colorText: "rgba(0,0,0,1)",
        colorTextSecondary: "rgba(0,0,0,0.88)",
        colorTextTertiary: "rgba(0,0,0,0.78)",
        colorTextQuaternary: "rgba(0,0,0,0.18)",
        motion: false // we are turning off motion as we want to prevent animations
    },
    components: {
        Layout: {
            footerBg: "transparent"
        },
        Badge: {
            textFontWeight: 700
        },
        Button: {
            primaryColor: "#FFF",
            fontWeight: 600
        },
        Card: {
            colorBorderSecondary: "#999",
            lineWidth: 0.05,
            lineType: "solid"
        },
        Descriptions: {
            contentColor: "rgba(0,0,0,1)",
            fontSize: 16
        },
        Divider: {
            colorSplit: "rgba(0,0,0,0.15)"
        },
        FloatButton: {
            colorBgElevated: "#FFF"
        },
        Menu: {
            itemHoverBg: "#54B226",
            itemSelectedBg: "#54B226",
            itemBorderRadius: 6,
            itemHoverColor: "#FFF",
            itemSelectedColor: "#FFF"
        },
        Modal: {
            contentBg: "#FFF",
            headerBg: "#FFF"
        },
        Tabs: {
            cardBg: "#FFF",
            itemColor: "rgba(0,0,0,1)",
            itemSelectedColor: "#54B226",
            itemHoverColor: "#54B226"
        },
        Select: {
            multipleItemBg: "#54B226",
            optionSelectedColor: "#FFF"
        },
        Tag: {
            defaultColor: "#FFF",
            defaultBg: "#54B226"
        },
        Tooltip: {
            colorBgSpotlight: "#FFF",
            colorTextLightSolid: "#000",
            colorBorderBg: "red",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            fontSize: 16
        },
        Carousel: {
            colorBgContainer: "#000",
            colorText: "#000"
        },
        Table: {
            rowSelectedBg: "#D3E6C3" // Softer green instead of #54B226
        }
    }
};

export default theme;
