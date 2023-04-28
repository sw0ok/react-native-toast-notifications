import React, { Component } from "react";
import {
    StyleSheet,
    ViewStyle,
    KeyboardAvoidingView,
    Platform,
    View,
    Pressable,
    ScrollView
} from "react-native";
import Toast, { ToastOptions, ToastProps } from "./toast";

export interface Props extends ToastOptions {
    renderToast?(toast: ToastProps): JSX.Element;
    renderType?: { [type: string]: (toast: ToastProps) => JSX.Element };
    offset?: number;
    offsetTop?: number;
    offsetBottom?: number;
    swipeEnabled?: boolean;
    foldIcon?: JSX.Element;
    clearIcon?: JSX.Element;
}

interface State {
    foldedToast: ToastProps;
    toastsHistory: Array<ToastProps>;
    unfolded: boolean;
    visible: boolean;
}

class ToastContainer extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            foldedToast: this.dummyToast,
            toastsHistory: [],
            unfolded: false,
            visible: true,
        };
    }

    foldedToastExsists = () => {return this.state.foldedToast.id !== this.dummyToast.id};
    toastHistoryExsists = () => {return this.state.toastsHistory.length > 0};
    componentDidUpdate(): void {
        // Without this unfolded view with remain oppened empty showing only buttons
        if (this.state.foldedToast === this.dummyToast && this.state.toastsHistory.length === 0 && this.state.unfolded) {
            this.setState({ unfolded: false }); 
        }
    }

    // Placeholder toast 
    dummyToast = {
        id: 'dummy',
        onDestroy: () => {},
        message: '',
        open: false,
        onHide: () => {}
    }

    static defaultProps: Props = {
        placement: "bottom",
        offset: 10,
        swipeEnabled: true,
    };

    /**
     * Toggles toast container visibility
     * @params show: boolean
     * @returns 
     */
    toggle = (show: boolean) => {
        this.setState({ visible: show });
    } 
    /**
     * Shows a new toast
     * @param message: string | JSX.Element
     * @param toastOptions?: ToastOptions
     * @returns id: string
     */
    show = (message: string | JSX.Element, toastOptions?: ToastOptions) => {
        let id = toastOptions?.id || Math.random().toString();
        // Function invoked on swipe dismiss or button dismiss
        const onDestroy = () => {
            /**
             * With toast.show() besides onPress we can pass onClose which is a function that will trigger on dismissal if passed
             * remaining code will revert the state to dummyToast if removed notification id === foldedToast.id
             * otherwise toastHistory state is set to current state with this toast filtered out
             */
            toastOptions?.onClose && toastOptions?.onClose();
            if(this.state.foldedToast.id === id) {
                return this.setState({ foldedToast: this.dummyToast});
            }
            this.setState({ toastsHistory: this.state.toastsHistory.filter((t) => t.id !== id) });
        };

        const newToast: ToastProps = {
            id,
            onDestroy,
            message,
            open: true,
            onHide: () => this.hide(id),
            ...this.props,
            ...toastOptions,
        }

        requestAnimationFrame(() => {
            if(!this.foldedToastExsists()) {
                this.setState({ foldedToast: newToast });
            }
            else {
                this.setState(
                    {
                        toastsHistory: [
                            this.state.foldedToast,
                            ...this.state.toastsHistory
                        ],
                        foldedToast: newToast
                    }
                )
            }
            });
            return id;
    };

    setUnfolded = (mode: boolean) => {
        this.setState({
            unfolded: mode
        });
    }

    /**
     * Updates a toast, To use this create you must pass an id to show method first, then pass it here to update the toast.
     * @param id: string
     * @param message: string | JSX.Element
     * @param toastOptions?: ToastOptions
     * @returns void
     */
    update = (
        id: string,
        message: string | JSX.Element,
        toastOptions: ToastOptions
    ) => {
        /**
         * This works as designed, legacy code does iterative updates first creating the container then populating it with content
         * because of that sepparate functions are fired in this iterative update, only partial updates have to occur
         * message = if msgExsists AND msg DIFF currState.message AND msg NOT null ? use provided : keep old
         * null !== undefined so if msg = null "&& message !== null" short circuits making this will equate to false and will keep the old
         * otherwise
         * msg = undefined "message &&" will short circuit and will equate to keep the old
         */
        if(this.state.foldedToast.id === id) {
            message = message && message !== this.state.foldedToast.message && message !== null ? message : this.state.foldedToast.message;
            toastOptions = toastOptions && toastOptions !== this.state.foldedToast && toastOptions !== null ? {...this.state.foldedToast, ...toastOptions} : {...this.state.foldedToast};
            this.setState({ foldedToast: {...this.state.foldedToast, ...toastOptions, message} });
        }
        else {
            let foundToast = this.state.toastsHistory.find((t) => t.id === id);
            if(foundToast) {
                message = message && message !== foundToast?.message ? message : foundToast?.message;
                // @ts-expect-error
                toastOptions = toastOptions && toastOptions !== foundToast ? {...foundToast, toastOptions} : {...foundToast}
                this.setState({ toastsHistory: this.state.toastsHistory.map((t) => t.id === id ? {...t, ...toastOptions, message} : t) });
            }
        };
    };

    /**
     * Returns toast with given ID
     * @param id 
     * @returns ToastProps |  undefined
     * 
     */
    getNotificationById = (id: string) => {
        if(this.state.foldedToast.id === id) {
            return this.state.foldedToast;
        }
        else if(this.toastHistoryExsists()) {
            return this.state.toastsHistory.find((toast) => toast.id === id);
        } else {
            return undefined;
        }
    }

    /**
     * Removes a toast from stack
     * @param id: string
     * @returns void
     */
    hide = (id: string) => {
        if(this.state.foldedToast.id === id) {
            return this.setState({ foldedToast: {...this.state.foldedToast, open: false}});
        }
        return this.setState({ 
            toastsHistory: this.state.toastsHistory.map((t) => t.id === id ? { ...t, open: false } : t) 
        });
    };

    /**
     * Removes all toasts in stack
     * @returns void
     */
    hideAll = () => {
        this.setState({
            foldedToast: {...this.state.foldedToast, open: false},
            toastsHistory: this.state.toastsHistory.map((t) => ({ ...t, open: false })),
            unfolded: false
        });
    };

    /**
     * Check if a toast is currently open
     * @params id: string
     * @returns boolean
     */
    isOpen = (id: string) => {
        if(this.state.foldedToast.id === id && this.state.foldedToast.open) {
            return true;
        }
        else {
            return this.state.toastsHistory.some((t) => t.id === id && t.open);
        }
    }

    renderToast() {
        // Single toast with props
        // const toast = this.foldedToastExsists() ? this.state.foldedToast : this.toastHistoryExsists() ? this.state.toastsHistory[0] : return null;
        let toast;
        if (this.foldedToastExsists()) {
            toast = this.state.foldedToast 
        } else if (this.toastHistoryExsists()) {
            toast = this.state.toastsHistory[0];
        } else return null;

        let { offset, offsetBottom } = this.props;
        let style: ViewStyle = {
            bottom: offsetBottom || offset,
            justifyContent: "flex-end",
            flexDirection: "column",
        };

        const onPress = (this.foldedToastExsists() && this.toastHistoryExsists() || this.state.toastsHistory.length > 1) ? () => this.setUnfolded(true) : toast?.onPress;
        const type = (this.foldedToastExsists() && this.toastHistoryExsists() || this.state.toastsHistory.length > 1) && !toast.data?.silent ? 'multiple' : undefined;
        const swipeable = type === 'multiple' ? false : true;

        return (
            <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "position" : undefined}
            pointerEvents="box-none"
            style={[styles.container, style]}
            >
                <Toast key={toast.id} {...toast} onPress={onPress} type={type} swipeEnabled={swipeable} />
            </KeyboardAvoidingView>
        );
    }

    unfoldedView = () => {
        let shouldRender = this.foldedToastExsists() || this.toastHistoryExsists();
        
        return shouldRender && <>
        <Pressable onPress={() => this.setUnfolded(false)} style={unfoldedStyles.backgroundDim} />
        <KeyboardAvoidingView 
            style={unfoldedStyles.container}
        >	
            <View style={unfoldedStyles.buttons}>
                <Pressable onPress={() => this.setUnfolded(false)} >{ this.props.foldIcon }</Pressable>
                <Pressable onPress={() => this.hideAll()} >{ this.props.clearIcon }</Pressable>
            </View>
            <ScrollView 
                contentContainerStyle={unfoldedStyles.scroll} 
                style={unfoldedStyles.scrollContainer}
                directionalLockEnabled={true}
            >
                {this.foldedToastExsists() && <Toast key={this.state.foldedToast.id} {...this.state.foldedToast} type='closeable' />}
                {this.toastHistoryExsists() && this.state.toastsHistory.map((t) => <Toast key={t.id} {...t} type='closeable' />)}
            </ScrollView>
        </KeyboardAvoidingView></>
    }

    render() {
        return (
            <>
                {this.state.visible ? (this.state.unfolded ? this.unfoldedView() : this.renderToast()) : null}
            </>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 0,
        position: "absolute",
        zIndex: 999999,
        elevation: 999999,
        flexDirection: 'column',
        width: '100%',
        maxWidth: 360,
        maxHeight: 90,
        minHeight: 74,
        minWidth: 358,
        padding: 10,
        left: '50%',
        //@ts-expect-error
        transform: [{translateX: '-50%'}],
    },

    message: {
        color: "white",
    },
});

const unfoldedStyles = StyleSheet.create({
    container: {
        flex: 0,
        zIndex: 999999,
        maxHeight: "50%",
        position: 'absolute',
        flexDirection: 'column',
        alignItems: 'center',
        bottom: 65,
        width: '100%',
        maxWidth: 360,
        left: '50%',
        //@ts-expect-error
        transform: [{translateX: '-50%'}]
    },

    backgroundDim: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, .5)',
    },

    scrollContainer: {
        marginTop: 8,
        width: '100%',
    },

    scroll: {
        position: 'relative',
        paddingTop: 10,
        flexDirection: 'column',
    },
    buttons: {
        flexDirection: 'row',
        alignSelf: 'center',
        justifyContent: 'flex-end',
        maxWidth: 358,
        width: '100%'
    },
});

export default ToastContainer;